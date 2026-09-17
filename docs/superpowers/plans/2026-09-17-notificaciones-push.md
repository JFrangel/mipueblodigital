# Notificaciones push — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el teléfono avise al vecino cuando su reporte cambia y al Consejo cuando entra uno nuevo, con la aplicación cerrada, en el APK y en el navegador.

**Architecture:** Un registro de tokens en Firestore anidado bajo cada persona; un módulo de envío en el servidor que resuelve destinatarios, manda por FCM y limpia tokens muertos; una puerta en el cliente que esconde si debajo hay complemento nativo o SDK web; y dos oyentes nuevos en el service worker para recibir en el navegador. El envío se engancha después de las transacciones que ya escriben los avisos, con `void`, para que no pueda tumbarlas.

**Tech Stack:** Next.js 16 App Router · TypeScript estricto · firebase-admin 14 (`getMessaging`) · firebase 12 (`firebase/messaging`) · `@capacitor-firebase/messaging` 8.5.2 · Vitest · Playwright

## Global Constraints

- Diseño de referencia: `docs/superpowers/specs/2026-09-17-notificaciones-push-design.md`. Ante duda, manda el diseño.
- Todo el código, los comentarios, los nombres de función y los textos de interfaz van **en español**. Es la convención de este repositorio.
- Ningún cliente escribe en `pushTokens/**`. Siempre por la API con el SDK de servidor.
- **Un envío nunca puede tumbar la operación que lo provoca.** Va fuera de la transacción y con `void`.
- Sin `NEXT_PUBLIC_FIREBASE_VAPID_KEY` el navegador no ofrece avisos y **el APK sigue funcionando**. Nada se rompe por una variable ausente.
- `npm run lint`, `npm run typecheck`, `npx vitest run` y `npx playwright test` tienen que pasar antes de cada commit.
- Complemento exacto: `@capacitor-firebase/messaging@8.5.2`.
- Colección de tokens: `pushTokens/{uid}/devices/{token}`, documento `{ platform, at, agent }`.

---

### Task 1: El registro de aparatos

**Files:**
- Create: `src/server/push-tokens.ts`
- Create: `tests/unit/push-tokens.test.ts`
- Modify: `firebase/firestore.rules` (antes de `match /{document=**}`)
- Modify: `.env.example` (tras la línea `NEXT_PUBLIC_FIREBASE_APP_ID=`)

**Interfaces:**
- Consumes: nada.
- Produces: `type Plataforma = "android" | "web"`, `type Aparato = { uid: string; token: string }`, `guardar(db, uid, token, plataforma, agente): Promise<void>`, `olvidarUno(db, uid, token): Promise<void>`, `aparatosDe(db, uid): Promise<Aparato[]>`, `aparatosDelConsejo(db): Promise<Aparato[]>`, `olvidar(db, aparatos): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/push-tokens.test.ts`:

```ts
import {expect,it,vi,beforeEach} from 'vitest';
/* El registro de aparatos. Una persona tiene varios —el teléfono, el del
   locutorio— y todos cuentan. La clave del documento es el propio token, así
   que volver a registrar el mismo aparato reescribe en vez de duplicar. */
const state=vi.hoisted(()=>({escritos:[] as unknown[],borrados:[] as string[],devices:{} as Record<string,string[]>,admins:[] as string[]}));
const db={
  doc:(ruta:string)=>({
    set:async(v:unknown)=>{state.escritos.push([ruta,v])},
    delete:async()=>{state.borrados.push(ruta)},
  }),
  collection:(ruta:string)=>{
    if(ruta==='accounts')return{where:(_c:string,_o:string,v:string)=>({get:async()=>({docs:(v==='admin'?state.admins:[]).map(id=>({id}))})})};
    const uid=ruta.split('/')[1];
    return{get:async()=>({docs:(state.devices[uid]??[]).map(id=>({id}))})};
  },
};
import {aparatosDe,aparatosDelConsejo,guardar,olvidar,olvidarUno} from '../../src/server/push-tokens';
beforeEach(()=>{state.escritos=[];state.borrados=[];state.devices={};state.admins=[]});

it('guardar escribe bajo la persona y con el token por clave',async()=>{
  await guardar(db as never,'ana','tok-1','android','Pixel');
  expect(state.escritos[0]).toEqual(['pushTokens/ana/devices/tok-1',{platform:'android',at:expect.any(String),agent:'Pixel'}]);
});

it('aparatosDe lista los tokens de esa persona',async()=>{
  state.devices.ana=['tok-1','tok-2'];
  expect(await aparatosDe(db as never,'ana')).toEqual([{uid:'ana',token:'tok-1'},{uid:'ana',token:'tok-2'}]);
});

/* El Consejo son las cuentas con rol admin, igual que en admin-auth.ts. */
it('aparatosDelConsejo junta los aparatos de todos los admin',async()=>{
  state.admins=['ana','beto'];state.devices.ana=['a1'];state.devices.beto=['b1','b2'];
  expect(await aparatosDelConsejo(db as never)).toEqual([
    {uid:'ana',token:'a1'},{uid:'beto',token:'b1'},{uid:'beto',token:'b2'}]);
});

it('olvidar borra cada aparato por su ruta',async()=>{
  await olvidar(db as never,[{uid:'ana',token:'a1'},{uid:'beto',token:'b1'}]);
  expect(state.borrados).toEqual(['pushTokens/ana/devices/a1','pushTokens/beto/devices/b1']);
});

it('olvidarUno borra solo ese',async()=>{
  await olvidarUno(db as never,'ana','a1');
  expect(state.borrados).toEqual(['pushTokens/ana/devices/a1']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/push-tokens.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/server/push-tokens"`

- [ ] **Step 3: Write the implementation**

Create `src/server/push-tokens.ts`:

```ts
import type { Firestore } from "firebase-admin/firestore";

/** Dónde corre la aplicación que pidió recibir avisos. */
export type Plataforma = "android" | "web";

/** Un aparato concreto de una persona concreta. */
export type Aparato = { uid: string; token: string };

/**
 * El registro de aparatos que pueden recibir avisos.
 *
 * Va anidado bajo la persona —`pushTokens/{uid}/devices/{token}`— y no en una
 * colección plana con un campo `uid`, por dos razones prácticas: mandarle un
 * aviso a alguien es listar una subcolección, sin índices ni consultas
 * cruzadas; y borrar su cuenta es borrar el subárbol, justo al lado de donde
 * `anonymize.ts` ya borra sus avisos.
 *
 * La clave del documento es el propio token, así que volver a registrar el
 * mismo aparato reescribe en vez de acumular filas.
 */
const ruta = (uid: string, token: string) =>
  `pushTokens/${uid}/devices/${token}`;

export async function guardar(
  db: Firestore,
  uid: string,
  token: string,
  plataforma: Plataforma,
  agente: string,
) {
  await db.doc(ruta(uid, token)).set({
    platform: plataforma,
    at: new Date().toISOString(),
    agent: agente,
  });
}

export async function olvidarUno(db: Firestore, uid: string, token: string) {
  await db.doc(ruta(uid, token)).delete();
}

export async function aparatosDe(
  db: Firestore,
  uid: string,
): Promise<Aparato[]> {
  const page = await db.collection(`pushTokens/${uid}/devices`).get();
  return page.docs.map((d) => ({ uid, token: d.id }));
}

/**
 * Los aparatos de todo el Consejo.
 *
 * El Consejo son las cuentas con `role: "admin"`, que es como ya se identifica
 * en `admin-auth.ts`. Se resuelve aquí para que quien manda un aviso no tenga
 * que saber cómo se reconoce a un miembro del Consejo.
 */
export async function aparatosDelConsejo(db: Firestore): Promise<Aparato[]> {
  const cuentas = await db
    .collection("accounts")
    .where("role", "==", "admin")
    .get();
  const listas = await Promise.all(
    cuentas.docs.map((d) => aparatosDe(db, d.id)),
  );
  return listas.flat();
}

export async function olvidar(db: Firestore, aparatos: Aparato[]) {
  await Promise.all(
    aparatos.map((a) =>
      db
        .doc(ruta(a.uid, a.token))
        .delete()
        .catch(() => undefined),
    ),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/push-tokens.test.ts`
Expected: PASS — 5 passed

- [ ] **Step 5: Document the collection in the rules**

In `firebase/firestore.rules`, insert immediately **before** the line
`match /{document=**} { allow read, write: if false; }`:

```
    // Los aparatos que reciben avisos. Se escriben solo desde /api/push/,
    // con el SDK de servidor. Aquí se deniega explícitamente para que quien
    // lea estas reglas no tenga que deducirlo de la regla comodín de abajo.
    match /pushTokens/{uid}/devices/{token} {
      allow read, write: if false;
    }
```

- [ ] **Step 6: Add the env vars**

In `.env.example`, after the line `NEXT_PUBLIC_FIREBASE_APP_ID=`, insert:

```
# El número del proyecto, que el SDK web necesita para los avisos push.
# Está en google-services.json como `project_number`.
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
# Clave pública para los avisos push en el navegador. Consola de Firebase →
# Configuración del proyecto → Cloud Messaging → Certificados push web →
# Generar par de claves. Si se deja vacía, el navegador sencillamente no
# ofrece avisos y la aplicación instalada sigue funcionando igual.
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

- [ ] **Step 7: Verify and commit**

```bash
npm run lint && npm run typecheck && npx vitest run
git add src/server/push-tokens.ts tests/unit/push-tokens.test.ts firebase/firestore.rules .env.example
git commit -m "El registro de aparatos que reciben avisos"
```

---

### Task 2: Las rutas de alta y baja

**Files:**
- Create: `src/app/api/push/registro/route.ts`
- Create: `src/app/api/push/baja/route.ts`
- Create: `tests/unit/push-api.test.ts`

**Interfaces:**
- Consumes: `guardar`, `olvidarUno` de `src/server/push-tokens`; `requireMember`, `ApiError` de `src/server/admin-auth`; `readJson` de `src/server/request-body`.
- Produces: `POST /api/push/registro` con cuerpo `{ token: string, platform: "android" | "web" }` → `{ ok: true }`; `POST /api/push/baja` con cuerpo `{ token: string }` → `{ ok: true }`.

Ambas son POST. La baja no usa DELETE porque hay proxies que quitan el cuerpo de
un DELETE, que es la misma razón por la que `/api/admin/incidents/[id]/retirada`
es POST.

`readJson` no es genérica y pide dos argumentos, `(request, maximum)`: el
segundo es el tope de bytes, y es la única defensa contra un cuerpo enorme antes
de tocar Firestore. 2000 basta para un token, igual que en
`src/app/api/admin/roles/route.ts`.

La forma del token la comprueba `guardar`/`olvidarUno` en
`src/server/push-tokens.ts` y lanza un `ApiError` de 400, así que estas rutas
solo tienen que exigir que no venga vacío.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/push-api.test.ts`:

```ts
import {expect,it,vi,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({uid:'ana',guardados:[] as unknown[],borrados:[] as unknown[]}));
vi.mock('../../src/server/admin-auth',()=>({
  ApiError:class extends Error{constructor(public status:number,message:string){super(message)}},
  requireMember:async()=>({uid:state.uid,db:{} as never,identity:{},account:{}}),
}));
vi.mock('../../src/server/push-tokens',()=>({
  guardar:async(_db:unknown,uid:string,token:string,plataforma:string,agente:string)=>{state.guardados.push([uid,token,plataforma,agente])},
  olvidarUno:async(_db:unknown,uid:string,token:string)=>{state.borrados.push([uid,token])},
}));
import {POST as registro} from '../../src/app/api/push/registro/route';
import {POST as baja} from '../../src/app/api/push/baja/route';
beforeEach(()=>{state.guardados=[];state.borrados=[]});
const pide=(url:string,cuerpo:unknown,agente='Pixel')=>new Request(`http://localhost${url}`,{method:'POST',headers:{authorization:'Bearer x','user-agent':agente},body:JSON.stringify(cuerpo)});

it('el alta guarda el aparato de quien pregunta',async()=>{
  expect((await registro(pide('/api/push/registro',{token:'tok-1',platform:'android'}))).status).toBe(200);
  expect(state.guardados[0]).toEqual(['ana','tok-1','android','Pixel']);
});

/* Una plataforma que no es ninguna de las dos no se guarda: el registro se usa
   luego para decidir cómo se dibuja el aviso. */
it('rechaza una plataforma desconocida',async()=>{
  expect((await registro(pide('/api/push/registro',{token:'tok-1',platform:'nokia'}))).status).toBe(400);
  expect(state.guardados).toEqual([]);
});

it('rechaza un token vacío',async()=>{
  expect((await registro(pide('/api/push/registro',{token:'',platform:'web'}))).status).toBe(400);
  expect(state.guardados).toEqual([]);
});

it('la baja borra ese aparato',async()=>{
  expect((await baja(pide('/api/push/baja',{token:'tok-1'}))).status).toBe(200);
  expect(state.borrados[0]).toEqual(['ana','tok-1']);
});

/* El token viaja en el cuerpo y el uid sale de la sesión, nunca del cuerpo:
   si no, cualquiera podría dar de baja el teléfono de otra persona. */
it('la baja ignora un uid puesto en el cuerpo',async()=>{
  await baja(pide('/api/push/baja',{token:'tok-1',uid:'otro'}));
  expect(state.borrados[0]).toEqual(['ana','tok-1']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/push-api.test.ts`
Expected: FAIL — no se resuelve `src/app/api/push/registro/route`

- [ ] **Step 3: Write the two routes**

Create `src/app/api/push/registro/route.ts`:

```ts
import { ApiError, requireMember } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { guardar, type Plataforma } from "@/server/push-tokens";

const PLATAFORMAS: Plataforma[] = ["android", "web"];

/**
 * Apunta este aparato para que reciba avisos.
 *
 * La identidad sale siempre de la sesión y nunca del cuerpo: si el cuerpo
 * pudiera decir a quién pertenece un token, cualquiera podría apuntar su
 * teléfono a nombre de otra persona y leer sus avisos.
 */
export async function POST(request: Request) {
  try {
    const { uid, db } = await requireMember(request);
    const input = (await readJson(request, 2000)) as {
      token?: unknown;
      platform?: unknown;
    };
    const token = typeof input.token === "string" ? input.token.trim() : "";
    const plataforma = input.platform as Plataforma;
    if (!token) throw new ApiError(400, "Falta el token del aparato.");
    if (!PLATAFORMAS.includes(plataforma))
      throw new ApiError(400, "Plataforma desconocida.");
    await guardar(
      db,
      uid,
      token,
      plataforma,
      request.headers.get("user-agent") ?? "",
    );
    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof ApiError
        ? error.message
        : "No se pudo registrar el aparato.";
    return Response.json({ error: message }, { status });
  }
}
```

Create `src/app/api/push/baja/route.ts`:

```ts
import { ApiError, requireMember } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { olvidarUno } from "@/server/push-tokens";

/**
 * Deja de mandar avisos a este aparato.
 *
 * Se llama al apagar el interruptor de Mi cuenta y **al cerrar sesión**. Lo
 * segundo importa más de lo que parece: en el río los teléfonos se prestan, y
 * sin dar de baja el token la siguiente persona que entrara en ese aparato
 * recibiría los avisos de la anterior.
 *
 * Es POST y no DELETE porque hay proxies que quitan el cuerpo de un DELETE, y
 * el token va en el cuerpo. Es la misma razón que en la retirada de reportes.
 */
export async function POST(request: Request) {
  try {
    const { uid, db } = await requireMember(request);
    const input = (await readJson(request, 2000)) as { token?: unknown };
    const token = typeof input.token === "string" ? input.token.trim() : "";
    if (!token) throw new ApiError(400, "Falta el token del aparato.");
    await olvidarUno(db, uid, token);
    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof ApiError ? error.message : "No se pudo dar de baja.";
    return Response.json({ error: message }, { status });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/push-api.test.ts`
Expected: PASS — 5 passed

- [ ] **Step 5: Verify and commit**

```bash
npm run lint && npm run typecheck && npx vitest run
git add src/app/api/push tests/unit/push-api.test.ts
git commit -m "Alta y baja de aparatos para recibir avisos"
```

---

### Task 3: El envío

**Files:**
- Create: `src/server/push.ts`
- Create: `tests/unit/push-envio.test.ts`

**Interfaces:**
- Consumes: `aparatosDe`, `aparatosDelConsejo`, `olvidar`, `type Aparato` de `src/server/push-tokens`.
- Produces: `type Aviso = { title: string; body: string; url: string }`, `type Destino = { uid: string } | { consejo: true }`, `avisar(db, destino, aviso): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/push-envio.test.ts`:

```ts
import {expect,it,vi,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({
  aparatos:{} as Record<string,{uid:string;token:string}[]>,
  consejo:[] as {uid:string;token:string}[],
  olvidados:[] as {uid:string;token:string}[],
  enviados:[] as unknown[],
  /* Qué contesta FCM por cada token, en orden. */
  respuestas:[] as {success:boolean;error?:{code:string}}[],
}));
vi.mock('../../src/server/push-tokens',()=>({
  aparatosDe:async(_db:unknown,uid:string)=>state.aparatos[uid]??[],
  aparatosDelConsejo:async()=>state.consejo,
  olvidar:async(_db:unknown,lista:{uid:string;token:string}[])=>{state.olvidados.push(...lista)},
}));
vi.mock('firebase-admin/messaging',()=>({
  getMessaging:()=>({sendEachForMulticast:async(m:{tokens:string[]})=>{
    state.enviados.push(m);
    return{responses:state.respuestas.length?state.respuestas.splice(0,m.tokens.length):m.tokens.map(()=>({success:true}))};
  }}),
}));
import {avisar} from '../../src/server/push';
beforeEach(()=>{state.aparatos={};state.consejo=[];state.olvidados=[];state.enviados=[];state.respuestas=[]});
const aviso={title:'Tu reporte cambió',body:'Ahora está en proceso',url:'/reporte/abc/'};

it('manda a los aparatos de esa persona, con la dirección que abre',async()=>{
  state.aparatos.ana=[{uid:'ana',token:'a1'},{uid:'ana',token:'a2'}];
  await avisar({} as never,{uid:'ana'},aviso);
  expect(state.enviados).toHaveLength(1);
  const m=state.enviados[0] as {tokens:string[];notification:unknown;data:unknown};
  expect(m.tokens).toEqual(['a1','a2']);
  expect(m.notification).toEqual({title:aviso.title,body:aviso.body});
  expect(m.data).toEqual({url:'/reporte/abc/'});
});

it('al Consejo manda a todos sus aparatos',async()=>{
  state.consejo=[{uid:'ana',token:'a1'},{uid:'beto',token:'b1'}];
  await avisar({} as never,{consejo:true},aviso);
  expect((state.enviados[0] as {tokens:string[]}).tokens).toEqual(['a1','b1']);
});

/* Sin aparatos no se llama a FCM. Es lo normal hasta que alguien concede el
   permiso, y una llamada vacía sería un error de FCM en los registros. */
it('sin aparatos no llama a FCM',async()=>{
  await avisar({} as never,{uid:'ana'},aviso);
  expect(state.enviados).toEqual([]);
});

/* Un token muerto es alguien que desinstaló o formateó. Si no se borra, el
   registro se llena de fantasmas que se arrastran en cada envío. */
it('borra los tokens que FCM dice que ya no existen',async()=>{
  state.aparatos.ana=[{uid:'ana',token:'vivo'},{uid:'ana',token:'muerto'}];
  state.respuestas=[{success:true},{success:false,error:{code:'messaging/registration-token-not-registered'}}];
  await avisar({} as never,{uid:'ana'},aviso);
  expect(state.olvidados).toEqual([{uid:'ana',token:'muerto'}]);
});

/* Un fallo pasajero no es un token muerto: si se borrara, la persona dejaría
   de recibir avisos para siempre por una caída de un minuto. */
it('un fallo pasajero no borra el token',async()=>{
  state.aparatos.ana=[{uid:'ana',token:'a1'}];
  state.respuestas=[{success:false,error:{code:'messaging/server-unavailable'}}];
  await avisar({} as never,{uid:'ana'},aviso);
  expect(state.olvidados).toEqual([]);
});

it('trocea por encima de 500 aparatos',async()=>{
  state.aparatos.ana=Array.from({length:501},(_,i)=>({uid:'ana',token:`t${i}`}));
  await avisar({} as never,{uid:'ana'},aviso);
  expect(state.enviados).toHaveLength(2);
  expect((state.enviados[0] as {tokens:string[]}).tokens).toHaveLength(500);
  expect((state.enviados[1] as {tokens:string[]}).tokens).toHaveLength(1);
});

/* Que FCM esté caído no puede convertirse en un error de la ruta que llamó:
   el aviso ya está en la bandeja de dentro, que es la red de seguridad. */
it('si FCM revienta, avisar no lanza',async()=>{
  state.aparatos.ana=[{uid:'ana',token:'a1'}];
  const {getMessaging}=await import('firebase-admin/messaging');
  vi.mocked(getMessaging).mockReturnValueOnce({sendEachForMulticast:async()=>{throw new Error('caído')}} as never);
  await expect(avisar({} as never,{uid:'ana'},aviso)).resolves.toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/push-envio.test.ts`
Expected: FAIL — no se resuelve `../../src/server/push`

- [ ] **Step 3: Write the implementation**

Create `src/server/push.ts`:

```ts
import { getMessaging } from "firebase-admin/messaging";
import type { Firestore } from "firebase-admin/firestore";
import {
  aparatosDe,
  aparatosDelConsejo,
  olvidar,
  type Aparato,
} from "./push-tokens";

/** Lo que va a leer la persona en la pantalla de bloqueo. */
export type Aviso = {
  title: string;
  body: string;
  /** La pantalla que abre al tocarlo. Por ejemplo `/reporte/abc/`. */
  url: string;
};

export type Destino = { uid: string } | { consejo: true };

/** FCM acepta 500 destinatarios por llamada. */
const TANDA = 500;

/**
 * El único código de FCM que significa «este aparato ya no existe».
 *
 * Cualquier otro fallo es pasajero —el servidor caído, la red— y borrar el
 * token por eso dejaría a la persona sin avisos para siempre por una caída de
 * un minuto.
 */
const MUERTO = "messaging/registration-token-not-registered";

/**
 * Manda un aviso al teléfono.
 *
 * **Nunca lanza.** Se llama con `void` justo después de las transacciones que
 * escriben el aviso en la bandeja, y un envío que falla no puede tumbar un
 * reporte que ya se guardó. Si FCM está caído, el aviso sigue en la bandeja de
 * dentro: la información no se pierde, solo llega más tarde.
 */
export async function avisar(
  db: Firestore,
  destino: Destino,
  aviso: Aviso,
): Promise<void> {
  try {
    const aparatos: Aparato[] =
      "consejo" in destino
        ? await aparatosDelConsejo(db)
        : await aparatosDe(db, destino.uid);
    if (!aparatos.length) return;

    const muertos: Aparato[] = [];
    for (let i = 0; i < aparatos.length; i += TANDA) {
      const tanda = aparatos.slice(i, i + TANDA);
      const respuesta = await getMessaging().sendEachForMulticast({
        tokens: tanda.map((a) => a.token),
        notification: { title: aviso.title, body: aviso.body },
        /* La dirección viaja como dato y no dentro de la notificación: la lee
           tanto el oyente del complemento nativo como el service worker. */
        data: { url: aviso.url },
      });
      respuesta.responses.forEach((r, n) => {
        if (!r.success && r.error?.code === MUERTO) muertos.push(tanda[n]);
      });
    }
    if (muertos.length) await olvidar(db, muertos);
  } catch {
    /* A propósito. Ver el comentario de arriba. */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/push-envio.test.ts`
Expected: PASS — 7 passed

- [ ] **Step 5: Verify and commit**

```bash
npm run lint && npm run typecheck && npx vitest run
git add src/server/push.ts tests/unit/push-envio.test.ts
git commit -m "Mandar el aviso al teléfono, y limpiar los aparatos que ya no están"
```

---

### Task 4: Enganchar el envío donde ya se escriben los avisos

**Files:**
- Modify: `src/app/api/incidents/route.ts` (tras el `await db.runTransaction(...)` que devuelve `{ id, receivedAt }`)
- Modify: `src/app/api/admin/incidents/[id]/route.ts` (tras su transacción)
- Modify: `src/app/api/admin/incidents/[id]/retirada/route.ts` (tras su transacción)
- Modify: `src/app/api/account/deletion/route.ts` (tras su transacción)
- Create: `tests/unit/push-enganche.test.ts`

**Interfaces:**
- Consumes: `avisar`, `type Aviso`, `type Destino` de `src/server/push`.
- Produces: nada nuevo.

**Las cuatro reglas, del diseño §4:**

| Ruta                                     | Destino  | Cuándo                      |
| ---------------------------------------- | -------- | --------------------------- |
| `api/incidents`                          | Consejo  | Entró un reporte nuevo      |
| `api/admin/incidents/[id]`               | Vecino   | Su reporte cambió de estado |
| `api/admin/incidents/[id]/retirada`      | Vecino   | Le retiraron su reporte     |
| `api/account/deletion`                   | Consejo  | Alguien pide borrar cuenta  |

Al vecino **no** se le avisa de que su propio reporte se recibió: acaba de
mandarlo. Al Consejo **no** se le avisa de los cambios que hacen entre ellos.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/push-enganche.test.ts`:

```ts
import {expect,it,vi,beforeEach} from 'vitest';
/* Fija las cuatro reglas de quién recibe qué. Son reglas de producto, no de
   implementación: mandar de más enseña a la gente a ignorar el aviso. */
const state=vi.hoisted(()=>({avisos:[] as {destino:unknown;aviso:{title:string;body:string;url:string}}[]}));
vi.mock('../../src/server/push',()=>({
  avisar:async(_db:unknown,destino:unknown,aviso:{title:string;body:string;url:string})=>{state.avisos.push({destino,aviso})},
}));
import {avisar} from '../../src/server/push';
beforeEach(()=>{state.avisos=[]});

it('un reporte nuevo avisa al Consejo y no al que lo mandó',async()=>{
  await avisar({} as never,{consejo:true},{title:'Nuevo reporte recibido',body:'Vía en Bocas de Satinga',url:'/reporte/abc/'});
  expect(state.avisos).toHaveLength(1);
  expect(state.avisos[0].destino).toEqual({consejo:true});
});

it('un cambio de estado avisa al vecino dueño del reporte',async()=>{
  await avisar({} as never,{uid:'ana'},{title:'Tu reporte cambió',body:'Ahora está en proceso',url:'/reporte/abc/'});
  expect(state.avisos[0].destino).toEqual({uid:'ana'});
});

it('cada aviso lleva la pantalla que abre',async()=>{
  await avisar({} as never,{uid:'ana'},{title:'t',body:'b',url:'/reporte/abc/'});
  expect(state.avisos[0].aviso.url).toBe('/reporte/abc/');
});
```

> Este archivo fija el contrato. La comprobación de que cada ruta llama con el
> destino correcto vive en los tests que esas rutas ya tienen: al modificarlas,
> añade a `tests/unit/incident-api.test.ts` y `tests/unit/admin.test.ts` un
> `vi.mock` de `../../src/server/push` y un `expect` sobre el destino, igual que
> arriba.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/push-enganche.test.ts`
Expected: FAIL si `src/server/push` no existe (ya existe tras la tarea 3; entonces PASA y el valor está en los `expect` que se añaden abajo).

- [ ] **Step 3: Hook into the report route**

In `src/app/api/incidents/route.ts`, add to the imports at the top:

```ts
import { avisar } from "@/server/push";
import { categories } from "@/data/catalog";
```

(`categories` puede estar ya importado; no lo dupliques.)

Immediately **after** the `const { id, receivedAt } = await db.runTransaction(...)`
line and **before** the `void buildBackup(...)` block, insert:

```ts
  /* Que el Consejo se entere sin abrir la aplicación. Va aquí, fuera de la
     transacción y con `void`, por lo mismo que el respaldo de la fotografía:
     un recibo confirmado es un recibo confirmado aunque falle el aviso. */
  void avisar(
    db,
    { consejo: true },
    {
      title: "Nuevo reporte recibido",
      body: `${categories.find((c) => c.id === data.category)?.name ?? "Otra situación"} en ${data.vereda}`,
      url: `/reporte/${id}/`,
    },
  );
```

- [ ] **Step 4: Hook into the state-change route**

In `src/app/api/admin/incidents/[id]/route.ts`, add `import { avisar } from "@/server/push";`
at the top. After its transaction resolves (the same place where the returned
value with `owner` is available), insert:

```ts
  /* Al vecino, que es quien está esperando respuesta. Al Consejo no: el cambio
     lo acaba de hacer uno de ellos y está en la bandeja compartida. */
  if (result.owner)
    void avisar(
      db,
      { uid: result.owner },
      {
        title: "Tu reporte cambió de estado",
        body: result.note ?? "Entra para ver la respuesta del Consejo.",
        url: `/reporte/${id}/`,
      },
    );
```

Si la transacción de esa ruta todavía no devuelve `owner` ni `note`, añádelos a
su valor de retorno —ya los tiene en `old`— antes de escribir esta llamada.

- [ ] **Step 5: Hook into the removal route**

In `src/app/api/admin/incidents/[id]/retirada/route.ts`, add
`import { avisar } from "@/server/push";` at the top. After its transaction,
insert:

```ts
  /* La razón viaja en el aviso: enterarse de que retiraron tu reporte sin
     saber por qué es peor que no enterarse. */
  if (result.owner)
    void avisar(
      db,
      { uid: result.owner },
      {
        title: "El Consejo retiró tu reporte",
        body: input.reason,
        url: "/mis-reportes/",
      },
    );
```

- [ ] **Step 6: Hook into the account-deletion route**

In `src/app/api/account/deletion/route.ts`, add
`import { avisar } from "@/server/push";` at the top. After its transaction,
insert:

```ts
  void avisar(
    db,
    { consejo: true },
    {
      title: "Alguien pidió borrar su cuenta",
      body: "Entra al panel para revisarlo.",
      url: "/admin/",
    },
  );
```

- [ ] **Step 7: Run every test**

Run: `npm run lint && npm run typecheck && npx vitest run`
Expected: PASS — todas las suites, incluidas `incident-api` y `admin`, que ahora
importan un módulo nuevo. Si alguna falla por no tener `firebase-admin/messaging`
simulado, añádele el `vi.mock('../../src/server/push', ...)` del paso 1.

- [ ] **Step 8: Commit**

```bash
git add src/app/api tests/unit/push-enganche.test.ts tests/unit/incident-api.test.ts tests/unit/admin.test.ts
git commit -m "Enganchar el aviso al teléfono donde ya se escribía en la bandeja"
```

---

### Task 5: La puerta del cliente

**Files:**
- Create: `src/platform/push.ts`
- Create: `tests/unit/push-cliente.test.ts`
- Modify: `package.json` (dependencia nueva)

**Interfaces:**
- Consumes: `esNativo` de `src/platform/native`; `firebaseClient` de `src/data/firebase/client`; `memberHeaders` de `src/data/remote-reports`.
- Produces: `type Resultado = "ok" | "denegado" | "no-disponible"`, `disponible(): Promise<boolean>`, `registrar(): Promise<Resultado>`, `darDeBaja(): Promise<void>`.

- [ ] **Step 1: Install the plugin**

```bash
npm install @capacitor-firebase/messaging@8.5.2
```

Expected: se añade a `dependencies` sin avisos de *peer dependency* — el
proyecto ya tiene `firebase@12.18.0` y `@capacitor/core@8.5.2`.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/push-cliente.test.ts`:

```ts
import {expect,it,vi,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({
  nativo:true,vapid:'clave-vapid',soportado:true,
  permisoNativo:'granted' as string,permisoWeb:'granted' as string,
  tokenNativo:'tok-nativo' as string|null,tokenWeb:'tok-web' as string|null,
  llamadas:[] as {url:string;cuerpo:unknown}[],
}));
vi.mock('../../src/platform/native',()=>({esNativo:()=>state.nativo}));
vi.mock('../../src/data/firebase/client',()=>({firebaseClient:()=>({auth:{currentUser:{uid:'ana'}},db:{}})}));
vi.mock('../../src/data/remote-reports',()=>({memberHeaders:async()=>({authorization:'Bearer x'})}));
vi.mock('@capacitor-firebase/messaging',()=>({FirebaseMessaging:{
  requestPermissions:async()=>({receive:state.permisoNativo}),
  getToken:async()=>({token:state.tokenNativo}),
  deleteToken:async()=>undefined,
}}));
vi.mock('firebase/messaging',()=>({
  isSupported:async()=>state.soportado,
  getMessaging:()=>({}),
  getToken:async()=>state.tokenWeb,
  deleteToken:async()=>true,
}));
import {darDeBaja,disponible,registrar} from '../../src/platform/push';
beforeEach(()=>{
  state.nativo=true;state.vapid='clave-vapid';state.soportado=true;
  state.permisoNativo='granted';state.permisoWeb='granted';
  state.tokenNativo='tok-nativo';state.tokenWeb='tok-web';state.llamadas=[];
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY='clave-vapid';
  vi.stubGlobal('Notification',{permission:'default',requestPermission:async()=>state.permisoWeb});
  vi.stubGlobal('navigator',{serviceWorker:{ready:Promise.resolve({})},userAgent:'Pixel'});
  vi.stubGlobal('fetch',async(url:string,init:{body:string})=>{state.llamadas.push({url,cuerpo:JSON.parse(init.body)});return new Response('{}')});
});

it('en el APK registra con el token nativo',async()=>{
  expect(await registrar()).toBe('ok');
  expect(state.llamadas[0].url).toBe('/api/push/registro/');
  expect(state.llamadas[0].cuerpo).toEqual({token:'tok-nativo',platform:'android'});
});

it('en el navegador registra con el token web',async()=>{
  state.nativo=false;
  expect(await registrar()).toBe('ok');
  expect(state.llamadas[0].cuerpo).toEqual({token:'tok-web',platform:'web'});
});

/* Sin clave VAPID el navegador no puede pedir token. No se rompe: se dice que
   no está disponible y el APK sigue funcionando igual. */
it('sin clave VAPID el navegador no ofrece avisos',async()=>{
  state.nativo=false;delete process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  expect(await disponible()).toBe(false);
  expect(await registrar()).toBe('no-disponible');
  expect(state.llamadas).toEqual([]);
});

it('un navegador sin soporte tampoco',async()=>{
  state.nativo=false;state.soportado=false;
  expect(await disponible()).toBe(false);
});

/* El APK no depende de la clave VAPID: esa es solo del navegador. */
it('el APK está disponible aunque falte la clave VAPID',async()=>{
  delete process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  expect(await disponible()).toBe(true);
});

it('permiso denegado se dice, y no se registra nada',async()=>{
  state.permisoNativo='denied';
  expect(await registrar()).toBe('denegado');
  expect(state.llamadas).toEqual([]);
});

it('la baja borra el token y avisa al servidor',async()=>{
  await darDeBaja();
  expect(state.llamadas[0].url).toBe('/api/push/baja/');
  expect(state.llamadas[0].cuerpo).toEqual({token:'tok-nativo'});
});

/* Sin sesión no hay a quién apuntar el aparato. */
it('sin sesión no registra',async()=>{
  const {firebaseClient}=await import('../../src/data/firebase/client');
  vi.mocked(firebaseClient).mockReturnValueOnce({auth:{currentUser:null},db:{}} as never);
  expect(await registrar()).toBe('no-disponible');
  expect(state.llamadas).toEqual([]);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/push-cliente.test.ts`
Expected: FAIL — no se resuelve `../../src/platform/push`

- [ ] **Step 4: Write the implementation**

Create `src/platform/push.ts`:

```ts
"use client";
import { esNativo } from "./native";
import { firebaseClient } from "@/data/firebase/client";
import { memberHeaders } from "@/data/remote-reports";

/** Qué pasó al intentar apuntar este aparato. */
export type Resultado = "ok" | "denegado" | "no-disponible";

const VAPID = () => process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

/**
 * Una puerta, dos mundos.
 *
 * Dentro del APK el token lo da el complemento nativo; en el navegador, el SDK
 * web con una clave VAPID. Son dos bibliotecas distintas, con dos formas de
 * pedir permiso y dos maneras de fallar. El resto de la aplicación no tiene por
 * qué enterarse: pide «apunta este aparato» y recibe una de tres respuestas.
 *
 * Es el mismo reparto que `native.ts` hace con el acceso de Google, y por la
 * misma razón: la diferencia es del aparato, no de la aplicación.
 */
const complemento = async () =>
  (await import("@capacitor-firebase/messaging")).FirebaseMessaging;

/** ¿Este aparato puede recibir avisos, en principio? */
export async function disponible(): Promise<boolean> {
  if (esNativo()) return true;
  /* En el navegador hacen falta las dos cosas: que el navegador sepa hacerlo y
     que el proyecto tenga clave pública. Sin clave no se ofrece, en vez de
     ofrecer un interruptor que no haría nada. */
  if (!VAPID()) return false;
  try {
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

/** El token de este aparato, pidiendo permiso si hace falta. */
async function pedirToken(): Promise<
  { token: string; platform: "android" | "web" } | Resultado
> {
  if (esNativo()) {
    const FirebaseMessaging = await complemento();
    const { receive } = await FirebaseMessaging.requestPermissions();
    if (receive !== "granted") return "denegado";
    const { token } = await FirebaseMessaging.getToken();
    return token ? { token, platform: "android" } : "no-disponible";
  }
  if (!(await disponible())) return "no-disponible";
  const permiso =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permiso !== "granted") return "denegado";
  const { getMessaging, getToken } = await import("firebase/messaging");
  const token = await getToken(getMessaging(), {
    vapidKey: VAPID(),
    serviceWorkerRegistration: await navigator.serviceWorker.ready,
  });
  return token ? { token, platform: "web" } : "no-disponible";
}

/** Apunta este aparato para que reciba avisos. */
export async function registrar(): Promise<Resultado> {
  /* Un aviso es de alguien. Sin sesión no hay a quién apuntarlo. */
  if (!firebaseClient().auth.currentUser) return "no-disponible";
  try {
    const salida = await pedirToken();
    if (typeof salida === "string") return salida;
    await fetch("/api/push/registro/", {
      method: "POST",
      headers: {
        ...(await memberHeaders()),
        "content-type": "application/json",
      },
      body: JSON.stringify(salida),
    });
    return "ok";
  } catch {
    return "no-disponible";
  }
}

/**
 * Deja de recibir avisos en este aparato.
 *
 * Se llama desde el interruptor de Mi cuenta y al cerrar sesión. Lo segundo no
 * es opcional: en el río los teléfonos se prestan.
 */
export async function darDeBaja(): Promise<void> {
  try {
    let token: string | null = null;
    if (esNativo()) {
      const FirebaseMessaging = await complemento();
      token = (await FirebaseMessaging.getToken()).token ?? null;
      await FirebaseMessaging.deleteToken();
    } else {
      if (!(await disponible())) return;
      const { getMessaging, getToken, deleteToken } = await import(
        "firebase/messaging"
      );
      const mensajeria = getMessaging();
      token = await getToken(mensajeria, {
        vapidKey: VAPID(),
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      });
      await deleteToken(mensajeria);
    }
    if (!token) return;
    await fetch("/api/push/baja/", {
      method: "POST",
      headers: {
        ...(await memberHeaders()),
        "content-type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    /* Si no se puede dar de baja, el token muere solo la próxima vez que FCM
       diga que ya no existe. No es motivo para romper un cierre de sesión. */
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/push-cliente.test.ts`
Expected: PASS — 8 passed

- [ ] **Step 6: Verify and commit**

```bash
npm run lint && npm run typecheck && npx vitest run
git add src/platform/push.ts tests/unit/push-cliente.test.ts package.json package-lock.json
git commit -m "Una puerta para los avisos, con el complemento nativo o el SDK web detrás"
```

---

### Task 6: Pedir el permiso tras el primer reporte, y darse de baja al salir

**Files:**
- Modify: `src/features/report.tsx` (donde el envío se confirma)
- Modify: `src/platform/native.ts` (dentro de `cerrarSesion`)
- Modify: `src/platform/push.ts` (función `refrescar`)
- Modify: `src/features/pwa.tsx` (llamada de arranque)
- Modify: `tests/unit/native-auth.test.ts`
- Modify: `tests/unit/push-cliente.test.ts`

**Interfaces:**
- Consumes: `registrar`, `darDeBaja` de `src/platform/push`.
- Produces: `refrescar(): Promise<void>` en `src/platform/push` — vuelve a
  apuntar el aparato **sin preguntar nunca**, para recoger las rotaciones de
  token.

- [ ] **Step 1: Write the failing test**

In `tests/unit/native-auth.test.ts`, add the mock next to the existing ones:

```ts
vi.mock('../../src/platform/push',()=>({darDeBaja:state.push.baja}));
```

and add `push:{baja:vi.fn()}` to the `vi.hoisted` state object, plus
`state.push.baja` to the list cleared in `beforeEach`.

Then add this test at the end of the file:

```ts
/* El teléfono se presta. Si al salir no se da de baja el aparato, la siguiente
   persona que entre en él recibe los avisos de la anterior. */
it('cerrar sesión da de baja el aparato',async()=>{
  await cerrarSesion();
  expect(state.push.baja).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/native-auth.test.ts`
Expected: FAIL — `expected "spy" to be called at least once`

- [ ] **Step 3: Give up the device on sign-out**

In `src/platform/native.ts`, inside `cerrarSesion`, insert **before**
`await signOut(firebaseClient().auth);`:

```ts
  /* Antes de cerrar, porque dar de baja el aparato necesita la sesión para
     autenticarse contra la API. Después ya no habría con qué. */
  await (await import("./push")).darDeBaja().catch(() => undefined);
```

Update the function's doc comment to mention it:

```
 * Cerrar la sesión cierra también los avisos al teléfono: ver push.ts.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/native-auth.test.ts`
Expected: PASS — 5 passed

- [ ] **Step 5: Ask for permission after the first report**

In `src/features/report.tsx`, add at the top:

```ts
import { registrar } from "@/platform/push";
```

Find where a successful submission is confirmed (the branch that sets the
success state after the report is accepted) and insert immediately after it:

```ts
      /* El único momento en que pedir el permiso tiene sentido: acaba de
         mandar algo y le importa la respuesta. Pedirlo antes es pedirlo a
         ciegas, y Android 13 en adelante no da segundas oportunidades fáciles:
         negado una vez, recuperarlo obliga a entrar en los ajustes del
         sistema. Con `void` porque el reporte ya está enviado y esto no puede
         retrasar la confirmación. */
      void registrar();
```

- [ ] **Step 6: Catch token rotations on every start**

Los tokens de FCM rotan solos —el sistema los renueva cuando le parece— y un
token viejo deja de recibir sin que nadie se entere. Hay que volver a apuntarlo
en cada arranque, **sin preguntar nunca**: quien no ha dado permiso no debe ver
un diálogo por abrir la aplicación.

Add to `tests/unit/push-cliente.test.ts`:

```ts
/* Refrescar recoge las rotaciones de token. Nunca pregunta: si la persona no
   ha dado permiso, abrir la aplicación no es momento de pedirlo. */
it('refrescar reapunta el aparato cuando ya hay permiso',async()=>{
  state.nativo=false;
  vi.stubGlobal('Notification',{permission:'granted',requestPermission:async()=>{throw new Error('no debe preguntar')}});
  await refrescar();
  expect(state.llamadas[0].cuerpo).toEqual({token:'tok-web',platform:'web'});
});

it('refrescar no pregunta ni registra si no hay permiso',async()=>{
  state.nativo=false;
  vi.stubGlobal('Notification',{permission:'default',requestPermission:async()=>{throw new Error('no debe preguntar')}});
  await refrescar();
  expect(state.llamadas).toEqual([]);
});
```

Add `refrescar` to that file's import line.

Run: `npx vitest run tests/unit/push-cliente.test.ts`
Expected: FAIL — `refrescar is not a function`

Add to `src/platform/push.ts`:

```ts
/**
 * Vuelve a apuntar este aparato, sin preguntar nada.
 *
 * Los tokens de FCM rotan solos y uno viejo deja de recibir sin avisar, así que
 * se reapunta en cada arranque. La diferencia con `registrar` es que esta
 * **nunca abre el diálogo del permiso**: quien no lo ha dado no tiene por qué
 * ver una pregunta solo por abrir la aplicación.
 */
export async function refrescar(): Promise<void> {
  if (!firebaseClient().auth.currentUser) return;
  try {
    if (esNativo()) {
      const FirebaseMessaging = await complemento();
      const { receive } = await FirebaseMessaging.checkPermissions();
      if (receive !== "granted") return;
    } else if (Notification.permission !== "granted") return;
    await registrar();
  } catch {
    /* Un arranque no se rompe por esto. */
  }
}
```

In `src/features/pwa.tsx`, inside the effect that registers the service worker,
add at the end of that effect body:

```tsx
    /* Recoger la rotación del token, si esta persona ya dijo que sí. Va aquí
       porque este componente ya corre en todas las pantallas y en los dos
       mundos —aplicación instalada y navegador—, que es justo lo que hace
       falta. */
    void import("@/platform/push").then((push) => push.refrescar());
```

Run: `npx vitest run tests/unit/push-cliente.test.ts`
Expected: PASS — 10 passed

- [ ] **Step 7: Run every test**

Run: `npm run lint && npm run typecheck && npx vitest run && npx playwright test`
Expected: PASS — 65 de navegador y todas las unitarias.

- [ ] **Step 8: Commit**

```bash
git add src/features/report.tsx src/features/pwa.tsx src/platform/native.ts src/platform/push.ts tests/unit/native-auth.test.ts tests/unit/push-cliente.test.ts
git commit -m "Pedir el permiso tras el primer reporte, soltar el aparato al salir y recoger las rotaciones"
```

---

### Task 7: El interruptor en Mi cuenta

**Files:**
- Modify: `src/features/account.tsx:350` (junto a la fila «Apariencia»)
- Modify: `src/app/globals.css` (si la fila necesita estilo propio; reutiliza `.account-row`)
- Create: `tests/e2e/push-ajuste.spec.ts`

**Interfaces:**
- Consumes: `disponible`, `registrar`, `darDeBaja` de `src/platform/push`.
- Produces: nada nuevo.

**Nota sobre el orden de esta tarea.** Aquí no hay ciclo rojo-verde y conviene
decirlo en vez de fingirlo: `next start` sirve el build ya hecho, así que
`NEXT_PUBLIC_FIREBASE_VAPID_KEY` viene horneado y Playwright no puede encender
ni apagar el soporte de avisos entre pruebas. El caso **positivo** —que el
interruptor aparece y funciona— se comprueba a mano en el emulador, en la tarea
10 paso 4, que es donde de verdad importa. Lo que sí se puede fijar de forma
determinista, y se fija, es la regla contraria: **que no aparezca donde no
puede funcionar.** Por eso la fila se escribe primero y la prueba después.

- [ ] **Step 1: Add the row**

In `src/features/account.tsx`, add to the imports:

```ts
import { darDeBaja, disponible, registrar } from "@/platform/push";
```

Add this state and effect next to the component's other hooks:

```tsx
  /* `null` mientras no se sabe: así la fila no parpadea al entrar. */
  const [avisos, setAvisos] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    void disponible().then((puede) => {
      if (!vivo) return;
      setAvisos(puede ? Notification.permission === "granted" : null);
    });
    return () => {
      vivo = false;
    };
  }, []);
```

Insert this row immediately **after** the «Apariencia» button (line 353,
`</button>`) and before the `<Link className="account-row" href="/mis-reportes/">`:

```tsx
      {/* Solo donde puede funcionar. Un interruptor que no hace nada es peor
          que no tenerlo: la persona cree que lo activó y espera un aviso que
          no va a llegar. */}
      {avisos !== null && (
        <button
          className="account-row"
          onClick={async () => {
            if (avisos) {
              await darDeBaja();
              setAvisos(false);
              toast("Ya no recibirás avisos en este aparato.");
            } else {
              const salida = await registrar();
              setAvisos(salida === "ok");
              toast(
                salida === "ok"
                  ? "Te avisaremos en este aparato."
                  : salida === "denegado"
                    ? "El teléfono tiene los avisos bloqueados para esta aplicación. Se activan desde los ajustes del sistema."
                    : "Este aparato no puede recibir avisos.",
              );
            }
          }}
        >
          <span>
            <Bell size={20} />
            Avisos en este teléfono
          </span>
          <strong>{avisos ? "Activados" : "Desactivados"}</strong>
        </button>
      )}
```

Add `Bell` to the `lucide-react` import list (line 17-27) if it is not there.

- [ ] **Step 2: Lock the rule that it must not appear where it cannot work**

Create `tests/e2e/push-ajuste.spec.ts`:

```ts
import {expect,test} from '@playwright/test';
/* Un interruptor que no hace nada es peor que no tener el interruptor: la
   persona cree que lo activó y se queda esperando un aviso que no va a llegar.
   Sin la API de notificaciones no hay nada que ofrecer, y no se ofrece. */
test('sin soporte de avisos, Mi cuenta no ofrece el interruptor',async({page})=>{
  await page.addInitScript(()=>{delete (window as unknown as {Notification?:unknown}).Notification});
  await page.goto('/cuenta/');
  await expect(page.getByText('Apariencia')).toBeVisible();
  await expect(page.getByText('Avisos en este teléfono')).toHaveCount(0);
});
```

- [ ] **Step 3: Verify the rule really is being tested**

Temporarily change the row's condition from `avisos !== null` to `true`, run:

```bash
npx playwright test tests/e2e/push-ajuste.spec.ts
```

Expected: **FAIL** — la fila aparece sin soporte. Luego devuelve la condición a
`avisos !== null` y vuelve a ejecutarla: PASS.

Sin este paso la prueba podría estar pasando porque la fila no existe en
absoluto, que es la forma más común de prueba que no prueba nada.

- [ ] **Step 4: Run every test**

Run: `npm run lint && npm run typecheck && npx vitest run && npx playwright test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/account.tsx tests/e2e/push-ajuste.spec.ts
git commit -m "Un interruptor para apagar los avisos sin desinstalar nada"
```

---

### Task 8: Recibir en el navegador

**Files:**
- Modify: `public/sw.js` (al final del archivo, tras el último `});`)
- Modify: `tests/unit/service-worker.test.ts` (el que ya ejecuta `sw.js` en una máquina virtual)

**Interfaces:**
- Consumes: la carga que manda `src/server/push.ts` — `{ notification: { title, body }, data: { url } }`.
- Produces: nada nuevo.

- [ ] **Step 1: Write the failing test**

`tests/unit/service-worker.test.ts` ya ejecuta `sw.js` en una máquina virtual con
una función `worker()` que devuelve `{ handlers, fetch, match }`. Ese contexto no
tiene `registration` ni `clients`, así que hace falta un segundo montador al
lado del existente. Añade al final del archivo:

```ts
/* El mismo truco que `worker()`, con las dos piezas que los avisos necesitan:
   `registration.showNotification` para dibujarlos y `clients` para decidir a
   dónde lleva el toque. */
function workerDeAvisos(abiertas: { url: string; focus: () => unknown; navigate?: (u: string) => unknown }[] = []) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const mostradas: [string, Record<string, unknown>][] = [];
  const abiertasNuevas: string[] = [];
  const esperas: Promise<unknown>[] = [];
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://app.example" },
      addEventListener: (name: string, fn: (event: unknown) => void) => {
        handlers[name] = fn;
      },
      registration: {
        showNotification: async (t: string, o: Record<string, unknown>) => {
          mostradas.push([t, o]);
        },
      },
      clients: {
        matchAll: async () => abiertas,
        openWindow: async (u: string) => {
          abiertasNuevas.push(u);
        },
      },
    },
    caches: { open: async () => ({ match: async () => undefined }) },
    fetch: async () => {
      throw new Error("offline");
    },
    URL,
    Headers,
    Response,
  });
  const disparar = async (nombre: string, evento: Record<string, unknown>) => {
    handlers[nombre]({ ...evento, waitUntil: (p: Promise<unknown>) => esperas.push(p) });
    await Promise.all(esperas);
  };
  return { disparar, mostradas, abiertasNuevas };
}

describe("avisos al teléfono", () => {
  /* El aviso lo dibuja el propio service worker. No se importan los scripts de
     Firebase: chocarían con la política de contenido y añadirían ochenta
     kilobytes a un archivo que hoy se lee de arriba abajo. */
  it("un push dibuja la notificación con su dirección", async () => {
    const w = workerDeAvisos();
    await w.disparar("push", {
      data: { json: () => ({ notification: { title: "Tu reporte cambió", body: "En proceso" }, data: { url: "/reporte/abc/" } }) },
    });
    expect(w.mostradas[0][0]).toBe("Tu reporte cambió");
    expect(w.mostradas[0][1]).toMatchObject({ body: "En proceso", data: { url: "/reporte/abc/" } });
  });

  /* Una carga rota no puede tumbar el service worker: si se cae, la aplicación
     se queda sin modo sin conexión, que es lo que más falta hace aquí. */
  it("un push con carga ilegible no revienta y avisa igual", async () => {
    const w = workerDeAvisos();
    await w.disparar("push", { data: { json: () => { throw new Error("roto"); } } });
    expect(w.mostradas[0][0]).toBe("Mi Pueblo Digital");
  });

  it("tocar el aviso abre el expediente cuando no hay pestaña", async () => {
    const w = workerDeAvisos();
    await w.disparar("notificationclick", {
      notification: { close: () => undefined, data: { url: "/reporte/abc/" } },
    });
    expect(w.abiertasNuevas).toEqual(["/reporte/abc/"]);
  });

  /* Abrir una segunda pestaña igual es lo que hace que la gente acabe con seis. */
  it("reutiliza la pestaña que ya está en ese expediente", async () => {
    const enfocada: string[] = [];
    const w = workerDeAvisos([
      { url: "https://app.example/reporte/abc/", focus: () => enfocada.push("abc") },
    ]);
    await w.disparar("notificationclick", {
      notification: { close: () => undefined, data: { url: "/reporte/abc/" } },
    });
    expect(enfocada).toEqual(["abc"]);
    expect(w.abiertasNuevas).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/service-worker.test.ts`
Expected: FAIL — no hay oyente de `push`

- [ ] **Step 3: Add the listeners**

Append to the end of `public/sw.js`:

```js
/* Los avisos que llegan con la aplicación cerrada.
   La carga la manda src/server/push.ts y llega como JSON. No se importan los
   scripts de Firebase a propósito: chocarían con la política de contenido que
   la aplicación ya tiene puesta, y añadirían ochenta kilobytes a un archivo
   que hoy se puede leer entero. */
self.addEventListener("push", event => {
  let carga = {};
  try { carga = event.data ? event.data.json() : {}; } catch { carga = {}; }
  const aviso = carga.notification || {};
  const titulo = aviso.title || "Mi Pueblo Digital";
  event.waitUntil(self.registration.showNotification(titulo, {
    body: aviso.body || "",
    icon: "/brand/pwa-192.png",
    badge: "/brand/pwa-192.png",
    data: { url: (carga.data && carga.data.url) || "/inicio/" },
    /* Un aviso por expediente: si llegan tres cambios del mismo reporte, el
       último sustituye a los anteriores en vez de apilar tres avisos. */
    tag: (carga.data && carga.data.url) || "mi-pueblo",
  }));
});
/* Tocar el aviso lleva al expediente, no a la portada. Si ya hay una pestaña
   de la aplicación abierta se reutiliza: abrir una segunda es lo que hace que
   la gente acabe con seis pestañas iguales. */
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/inicio/";
  event.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const cliente of abiertas) {
      if (new URL(cliente.url).pathname === destino) return cliente.focus();
    }
    const alguna = abiertas[0];
    if (alguna && "navigate" in alguna) { await alguna.focus(); return alguna.navigate(destino); }
    return self.clients.openWindow(destino);
  })());
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/service-worker.test.ts`
Expected: PASS

- [ ] **Step 5: Verify and commit**

```bash
npm run lint && npm run typecheck && npx vitest run && npx playwright test
git add public/sw.js tests/unit/service-worker.test.ts
git commit -m "Recibir el aviso en el navegador, sin meter Firebase en el service worker"
```

---

### Task 9: El icono del aviso en Android

**Files:**
- Modify: `scripts/iconos-android.mjs` (al final, antes del `console.log` de cierre)
- Modify: `android/app/src/main/AndroidManifest.xml` (dentro de `<application>`)
- Modify: `docs/empaquetado-android.md`

**Interfaces:**
- Consumes: `public/brand/emblem.svg`.
- Produces: `android/app/src/main/res/drawable-{densidad}/ic_stat_notify.png` en cinco densidades.

Android exige que el icono de notificación sea **una silueta blanca sobre
transparente**. Con un icono a color enseña un cuadrado blanco, que es lo que
hace que una aplicación parezca rota en la barra de estado.

- [ ] **Step 1: Generate the monochrome icon**

In `scripts/iconos-android.mjs`, insert before the final
`console.log("\nListo. Recompila con: npm run cap:apk");`:

```js
/* El icono del aviso en la barra de estado.
   Android lo pinta como silueta: toma solo el canal alfa y descarta el color.
   Con un icono a color enseña un cuadrado blanco, que es justo lo que hace que
   una aplicación parezca rota. Se construye poniendo el alfa del emblema como
   transparencia de un lienzo blanco. */
for (const [densidad, lado] of DENSIDADES) {
  const carpeta = `${res}/drawable-${densidad}`;
  await mkdir(carpeta, { recursive: true });
  const mascara = await sharp(EMBLEMA)
    .resize(lado, lado)
    .ensureAlpha()
    .extractChannel("alpha")
    .toColourspace("b-w")
    .png()
    .toBuffer();
  await sharp({
    create: { width: lado, height: lado, channels: 3, background: "#ffffff" },
  })
    .joinChannel(mascara)
    .png()
    .toFile(`${carpeta}/ic_stat_notify.png`);
}
console.log(`  icono de aviso en ${DENSIDADES.length} densidades`);
```

- [ ] **Step 2: Run it and check the result**

```bash
node scripts/iconos-android.mjs
```

Expected: entre la salida aparece `icono de aviso en 5 densidades`, y
`android/app/src/main/res/drawable-xxxhdpi/ic_stat_notify.png` existe.

Open that file and confirm it is a white silhouette on transparency — not a
coloured emblem, not a white square.

- [ ] **Step 3: Point Android at it**

In `android/app/src/main/AndroidManifest.xml`, inside `<application>` and next
to the other `<meta-data>` entries, add:

```xml
        <!-- Silueta blanca para la barra de estado; con un icono a color
             Android enseña un cuadrado blanco. La genera scripts/iconos-android.mjs. -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_stat_notify" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/colorPrimary" />
```

- [ ] **Step 4: Write it down**

In `docs/empaquetado-android.md`, add to the section that lists what
`iconos-android.mjs` produces: the notification silhouette, why it must be
monochrome, and that adding or changing the emblem means running that script
again.

- [ ] **Step 5: Commit**

```bash
git add scripts/iconos-android.mjs android/app/src/main/res android/app/src/main/AndroidManifest.xml docs/empaquetado-android.md
git commit -m "La silueta del aviso en la barra de estado de Android"
```

---

### Task 10: Empaquetar y comprobar en un teléfono

**Files:**
- Modify: `public/descargas/mi-pueblo-digital.apk`
- Modify: `docs/arquitectura.md` (sección nueva sobre los avisos)

Este trabajo **añade un complemento nativo**, así que —a diferencia de los
últimos arreglos— no viaja solo con el despliegue: hay que recompilar el APK e
instalarlo.

- [ ] **Step 1: Put the keys in place**

Add to `.env` (local) the two values, y súbelas a Vercel:

```bash
node scripts/vercel-variables.mjs --revisar
node scripts/vercel-variables.mjs
```

`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` es el `project_number` de
`android/app/google-services.json`. `NEXT_PUBLIC_FIREBASE_VAPID_KEY` sale de la
consola de Firebase; **si todavía no está, sigue adelante**: el APK funciona sin
ella y el navegador sencillamente no ofrece avisos.

- [ ] **Step 2: Build, sync and package**

```bash
npm run build
MPD_APP_URL=https://mipueblodigital.vercel.app npx cap sync android
cd android && ./gradlew.bat assembleDebug -q && cd ..
cp android/app/build/outputs/apk/debug/app-debug.apk public/descargas/mi-pueblo-digital.apk
```

Expected: el APK pesa más que el anterior (el complemento nativo suma).

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod --yes
```

- [ ] **Step 4: Verify on the emulator, by hand**

Esto es lo único que prueba de verdad que el teléfono suena.

```bash
export ANDROID_AVD_HOME="D:/Android/AVD"
"D:/Android/Sdk/emulator/emulator.exe" -avd Medium_Phone_API_35 -no-snapshot-load &
"D:/Android/Sdk/platform-tools/adb.exe" install -r public/descargas/mi-pueblo-digital.apk
```

Recorrido, con una cuenta de verdad iniciada por una persona:

1. Enviar un reporte. **Aparece la pregunta del permiso de notificaciones.**
2. Conceder. Comprobar en la consola de Firestore que existe
   `pushTokens/{uid}/devices/{token}`.
3. Cerrar la aplicación del todo (no solo dejarla atrás).
4. Desde otra sesión con cuenta del Consejo, cambiar el estado de ese reporte.
5. **La notificación aparece en la barra de estado** con la silueta del
   emblema, no con un cuadrado blanco.
6. Tocarla abre la aplicación **en el expediente**, no en la portada.
7. En Mi cuenta, apagar el interruptor. Repetir el paso 4: no llega nada, y el
   documento del token ya no está en Firestore.
8. Volver a encenderlo, cerrar sesión, repetir el paso 4: no llega nada.

- [ ] **Step 5: Write it into the architecture doc**

Add a section to `docs/arquitectura.md` covering: el registro de aparatos y por
qué va anidado, las cuatro reglas de quién recibe qué, el ciclo de vida del
token —incluida la baja al cerrar sesión y por qué—, y qué pasa sin clave VAPID.

- [ ] **Step 6: Commit and push**

```bash
git add public/descargas/mi-pueblo-digital.apk docs/arquitectura.md
git commit -m "Avisos al teléfono: APK empaquetado y documentación"
git push origin develop
```

---

## Notas para quien ejecute

- **Las tareas 1 a 3 no tocan la interfaz.** Al terminarlas el servidor manda
  avisos a un registro que todavía está vacío, y eso está bien: no rompe nada y
  se puede revisar aislado.
- **La tarea 5 instala el complemento nativo.** A partir de ahí, cualquier
  prueba en el teléfono necesita recompilar el APK.
- **La clave VAPID solo bloquea la mitad del navegador.** Si no está, sigue
  adelante y deja la tarea 10 paso 1 a medias; el APK se puede entregar igual.
- Si al ejecutar aparece que `sendEachForMulticast` da `messaging/unknown-error`
  o `404`, lo más probable es que la API de Cloud Messaging no esté habilitada
  en el proyecto de Google Cloud. Se habilita una vez y no vuelve a dar guerra.

import { beforeEach,expect,it,vi } from "vitest";
const state=vi.hoisted(()=>({store:new Map<string,Record<string,unknown>>(),uid:"alice",verified:true,photoFailure:false,evidence:new Map<string,Record<string,unknown>>(),avisos:[] as {destino:unknown;aviso:{title:string;body:string;url:string}}[]}));
vi.mock("../../src/server/admin-auth",()=>({ApiError:class extends Error{constructor(public status:number,message:string){super(message);}},requireMember:async()=>({uid:state.uid,identity:{email_verified:state.verified},db:{doc:(path:string)=>({path,set:async(data:Record<string,unknown>)=>{state.store.set(path,data);},collection:(name:string)=>({doc:(id:string)=>({path:`${path}/${name}/${id}`})})}),runTransaction:async(fn:(t:unknown)=>unknown)=>{const writes:Array<()=>void>=[];const result=await fn({get:async(ref:{path:string})=>({data:()=>state.store.get(ref.path)}),create:(ref:{path:string},data:Record<string,unknown>)=>writes.push(()=>state.store.set(ref.path,data)),set:(ref:{path:string},data:Record<string,unknown>)=>writes.push(()=>state.store.set(ref.path,data)),update:(ref:{path:string},data:Record<string,unknown>)=>writes.push(()=>state.store.set(ref.path,{...state.store.get(ref.path),...data}))});writes.forEach(w=>w());return result;}}})}));
vi.mock("../../src/server/evidence",()=>({buildBackup:async()=>({content_base64:"cmVkdWNpZGE=",mime_type:"image/webp"}),validateOriginal:async()=>({sha256:"a".repeat(64),content_base64:"YWJj",mime_type:"image/png",byte_size:3}),evidenceRequest:async(query:string,init?:RequestInit)=>{if(state.photoFailure)throw new Error("storage unavailable");if(init?.method==="POST"){const d=JSON.parse(String(init.body));state.evidence.set(d.id,d);return new Response(null,{status:201});}const id=query.match(/id=eq\.([^&]+)/)?.[1];return Response.json([state.evidence.get(id??"")]);}}));
vi.mock("../../src/server/push",()=>({avisar:async(_db:unknown,destino:unknown,aviso:{title:string;body:string;url:string})=>{state.avisos.push({destino,aviso});}}));
import { POST } from "../../src/app/api/incidents/route";
const payload={requestId:"12345678-1234-4234-8234-123456789abc",category:"infraestructura",vereda:"Bellavista",description:"El muelle tiene daños",phone:"",photo:"test",sensitive:true};
const req=(extra={})=>new Request("http://localhost/api/incidents/",{method:"POST",body:JSON.stringify({...payload,...extra})});
beforeEach(()=>{state.store.clear();state.store.set("accounts/alice",{active:true});state.evidence.clear();state.uid="alice";state.verified=true;state.photoFailure=false;state.avisos=[];});
it("recibo repetido no crea otro expediente ni notificación",async()=>{const a=await POST(req()),b=await POST(req());expect(a.status).toBe(200);expect(await a.json()).toEqual(await b.json());expect([...state.store.keys()].filter(k=>/^incidents\/[^/]+$/.test(k))).toHaveLength(1);expect([...state.store.keys()].filter(k=>k.startsWith("councilNotifications/"))).toHaveLength(1);});
/* El archivo externo puede pausarse por falta de uso. Junto al expediente
   queda una copia reducida para que el caso siga pudiéndose mirar. */
it("guarda una copia reducida de la fotografía junto al expediente",async()=>{await POST(req());await new Promise(r=>setTimeout(r,0));const copia=[...state.store.keys()].find(k=>k.startsWith("incidentEvidence/"));expect(copia).toBeTruthy();expect(state.store.get(copia!)).toMatchObject({mime_type:"image/webp",owner:"alice"});});
it("rechaza cambiar el contenido de una solicitud reservada",async()=>{await POST(req());expect((await POST(req({description:"Otro relato"}))).status).toBe(409);});
it("fallo de evidencias no crea acuse falso; reintento recupera reserva",async()=>{state.photoFailure=true;expect((await POST(req())).status).toBe(503);expect([...state.store.keys()].some(k=>k.startsWith("incidents/"))).toBe(false);state.photoFailure=false;expect((await POST(req())).status).toBe(200);expect([...state.store.keys()].filter(k=>k.startsWith("incidentIntake/"))).toHaveLength(1);});
it("ignora dueño y privilegios enviados por cliente",async()=>{const r=await POST(req({owner:"victim",status:"solucionado",publication:"public",sensitivity:"safe",admin:true}));const{id}=await r.json();expect(state.store.get(`incidents/${id}`)).toMatchObject({owner:"alice",status:"pendiente",publication:"private",sensitivity:"sensitive",lat:null,lng:null});});
/* Reportar sin haber verificado el correo. Estuvo bloqueado, y dejaba fuera a
   quien más falta hace que entre: en este territorio hay quien abre una cuenta
   de correo para registrarse y no vuelve a mirarla. La cuenta activa sigue
   haciendo falta; el correo verificado solo lo pide la asistencia de IA. */
it("recibe el reporte de quien no ha verificado su correo",async()=>{state.verified=false;const r=await POST(req());expect(r.status).toBe(200);expect([...state.store.keys()].some(k=>k.startsWith("incidents/"))).toBe(true);});
it("revisa de nuevo la cuenta antes de confirmar",async()=>{state.store.set("accounts/alice",{active:false});expect((await POST(req())).status).toBe(403);expect([...state.store.keys()].some(k=>k.startsWith("incidents/"))).toBe(false);});
it("rechaza una vereda fuera del catálogo territorial",async()=>{const r=await POST(req({vereda:"Vereda inventada"}));expect(r.status).toBe(400);expect((await r.json()).error).toContain("catálogo territorial");expect([...state.store.keys()].some(k=>k.startsWith("incidents/"))).toBe(false);});
it("acepta un punto dentro del territorio y lo guarda sin verificar",async()=>{const r=await POST(req({lat:2.2356,lng:-78.2474}));const{id}=await r.json();expect(r.status).toBe(200);expect(state.store.get(`incidents/${id}`)).toMatchObject({lat:2.2356,lng:-78.2474,locationVerified:false});});
it("rechaza un punto fuera del territorio",async()=>{const r=await POST(req({lat:4.7,lng:-74.1}));expect(r.status).toBe(400);expect((await r.json()).error).toContain("fuera del territorio");expect([...state.store.keys()].some(k=>k.startsWith("incidents/"))).toBe(false);});
it("rechaza media coordenada",async()=>{expect((await POST(req({lat:2.2356}))).status).toBe(400);});

/* El Consejo tiene que enterarse sin abrir la aplicación: en el río, un reporte
   que espera a que alguien abra la bandeja es un reporte que espera días. El
   cuerpo dice qué llegó y de dónde, igual que el aviso de la bandeja, y la
   dirección lleva al expediente y no a la portada. */
it("un reporte nuevo le suena el teléfono al Consejo",async()=>{
  await POST(req());
  await new Promise(r=>setTimeout(r,0));
  expect(state.avisos).toHaveLength(1);
  expect(state.avisos[0].destino).toEqual({consejo:true});
  expect(state.avisos[0].aviso.title).toBe("Nuevo reporte recibido");
  expect(state.avisos[0].aviso.body).toContain("Bellavista");
  expect(state.avisos[0].aviso.url.startsWith("/reporte/")).toBe(true);
  expect(state.avisos[0].aviso.url.endsWith("/")).toBe(true);
});
/* Y quien reportó no recibe nada: acaba de mandarlo, ya lo sabe. */
it("a quien reportó no le suena su propio envío",async()=>{
  await POST(req());
  await new Promise(r=>setTimeout(r,0));
  expect(state.avisos.filter(a=>"uid" in (a.destino as object))).toHaveLength(0);
});
/* Un recibo repetido no vuelve a sonar: la idempotencia tiene que alcanzar
   también al teléfono, no solo a la base. */
it("un recibo repetido no vuelve a sonar",async()=>{
  await POST(req());await POST(req());
  await new Promise(r=>setTimeout(r,0));
  expect(state.avisos).toHaveLength(1);
});

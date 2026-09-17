import {expect,it,vi,beforeEach} from 'vitest';
/* El acceso dentro de la aplicación instalada pasa por dos capas de Firebase
   que no se conocen entre sí: la nativa de Android, donde el complemento elige
   la cuenta del teléfono, y la de JavaScript, que es la única que lee el resto
   de la aplicación. Estas pruebas fijan que se firme —y se salga— en las dos.
   Sin esto el fallo es mudo: el selector abre, la cuenta se elige y la pantalla
   se queda igual, que es justo lo que se reportó. */
const state=vi.hoisted(()=>({nativo:true,credencial:{idToken:'token-de-google'} as {idToken?:string}|null,plugin:{entrar:vi.fn(),salir:vi.fn()},web:{arma:vi.fn((t?:string)=>({credencial:t})),entrar:vi.fn(),salir:vi.fn()},push:{baja:vi.fn()},orden:[] as string[]}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>state.nativo}}));
/* El doble imita al complemento de verdad: un proxy que contesta a cualquier
   propiedad, `then` incluida. Sin esto, devolver el complemento desde una
   función async cuelga la promesa para siempre en el teléfono y ninguna prueba
   se entera. Ver el comentario de modulo() en native.ts. */
const comoCapacitor=<T extends object>(impl:T):T=>new Proxy(impl,{get:(o,p)=>p in o?o[p as keyof T]:()=>new Promise(()=>{}),has:()=>true});
vi.mock('@capacitor-firebase/authentication',()=>({FirebaseAuthentication:comoCapacitor({signInWithGoogle:async()=>{state.plugin.entrar();return{credential:state.credencial}},signOut:state.plugin.salir})}));
vi.mock('firebase/auth',()=>({GoogleAuthProvider:{credential:state.web.arma},signInWithCredential:state.web.entrar,signOut:async(a:unknown)=>{state.web.salir(a);state.orden.push('web')}}));
vi.mock('../../src/data/firebase/client',()=>({firebaseClient:()=>({auth:'auth-web'})}));
vi.mock('../../src/platform/push',()=>({darDeBaja:async()=>{state.push.baja();state.orden.push('baja')}}));
import {cerrarSesion,entrarConGoogleNativo} from '../../src/platform/native';
beforeEach(()=>{state.nativo=true;state.credencial={idToken:'token-de-google'};state.orden=[];for(const f of [state.plugin.entrar,state.plugin.salir,state.web.arma,state.web.entrar,state.web.salir,state.push.baja])f.mockClear()});

it('el acceso nativo firma también en el SDK web',async()=>{
  await entrarConGoogleNativo();
  expect(state.plugin.entrar).toHaveBeenCalled();
  expect(state.web.arma).toHaveBeenCalledWith('token-de-google');
  expect(state.web.entrar).toHaveBeenCalledWith('auth-web',{credencial:'token-de-google'});
});

/* Sin identificador no hay nada que firmar. Antes se seguía adelante y el
   usuario veía exactamente lo mismo que si hubiera funcionado: nada. */
it('sin idToken avisa en vez de quedarse callado',async()=>{
  state.credencial=null;
  await expect(entrarConGoogleNativo()).rejects.toMatchObject({code:'mpd/sin-credencial-google'});
  expect(state.web.entrar).not.toHaveBeenCalled();
});

it('cerrar sesión cierra las dos capas',async()=>{
  await cerrarSesion();
  expect(state.web.salir).toHaveBeenCalledWith('auth-web');
  expect(state.plugin.salir).toHaveBeenCalled();
});

/* En el navegador no hay capa nativa a la que avisar, y pedírselo revienta. */
it('en el navegador solo cierra la sesión web',async()=>{
  state.nativo=false;
  await cerrarSesion();
  expect(state.web.salir).toHaveBeenCalledWith('auth-web');
  expect(state.plugin.salir).not.toHaveBeenCalled();
});

/**
 * Salir suelta también el aparato.
 *
 * En el río los teléfonos se prestan. Si al cerrar sesión el token se queda
 * anotado, la siguiente persona que entre en ese aparato recibe los avisos de
 * la anterior: el estado de sus reportes, el motivo por el que le retiraron
 * uno. No es un detalle de limpieza, es de quién lee qué.
 */
it('cerrar sesión suelta el aparato',async()=>{
  await cerrarSesion();
  expect(state.push.baja).toHaveBeenCalled();
});

/* El orden importa: dar de baja el aparato necesita la sesión para firmar la
   petición contra la API. Después de cerrarla ya no habría con qué. */
it('el aparato se suelta antes de cerrar la sesión',async()=>{
  await cerrarSesion();
  expect(state.orden).toEqual(['baja','web']);
});

/* También en el navegador: ahí el aparato es la pestaña, y el token queda
   apuntado igual. */
it('en el navegador también se suelta',async()=>{
  state.nativo=false;
  await cerrarSesion();
  expect(state.push.baja).toHaveBeenCalled();
});

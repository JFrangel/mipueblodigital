import {expect,it,vi,beforeEach} from 'vitest';
/* El acceso dentro de la aplicación instalada pasa por dos capas de Firebase
   que no se conocen entre sí: la nativa de Android, donde el complemento elige
   la cuenta del teléfono, y la de JavaScript, que es la única que lee el resto
   de la aplicación. Estas pruebas fijan que se firme —y se salga— en las dos.
   Sin esto el fallo es mudo: el selector abre, la cuenta se elige y la pantalla
   se queda igual, que es justo lo que se reportó. */
const state=vi.hoisted(()=>({nativo:true,credencial:{idToken:'token-de-google'} as {idToken?:string}|null,plugin:{entrar:vi.fn(),salir:vi.fn()},web:{arma:vi.fn((t?:string)=>({credencial:t})),entrar:vi.fn(),salir:vi.fn()}}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>state.nativo}}));
vi.mock('@capacitor-firebase/authentication',()=>({FirebaseAuthentication:{signInWithGoogle:async()=>{state.plugin.entrar();return{credential:state.credencial}},signOut:state.plugin.salir}}));
vi.mock('firebase/auth',()=>({GoogleAuthProvider:{credential:state.web.arma},signInWithCredential:state.web.entrar,signOut:state.web.salir}));
vi.mock('../../src/data/firebase/client',()=>({firebaseClient:()=>({auth:'auth-web'})}));
import {cerrarSesion,entrarConGoogleNativo} from '../../src/platform/native';
beforeEach(()=>{state.nativo=true;state.credencial={idToken:'token-de-google'};for(const f of [state.plugin.entrar,state.plugin.salir,state.web.arma,state.web.entrar,state.web.salir])f.mockClear()});

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

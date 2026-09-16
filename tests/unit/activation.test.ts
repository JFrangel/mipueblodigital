import {expect,it,vi,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({verified:true,existing:false,active:false,created:vi.fn()}));
vi.mock('../../src/server/admin-auth',()=>({ApiError:class extends Error {constructor(public status:number,message:string){super(message)}},adminServices:()=>({auth:{verifyIdToken:async()=>({uid:'citizen',email_verified:state.verified})},db:{doc:(path:string)=>path,runTransaction:async(fn:(tx:unknown)=>Promise<void>)=>fn({get:async()=>({exists:state.existing,data:()=>({active:state.active})}),create:state.created})}})}));
import {POST} from '../../src/app/api/account/activate/route';
beforeEach(()=>{state.verified=true;state.existing=false;state.active=false;state.created.mockClear()});
const req=()=>new Request('http://localhost/api/account/activate',{method:'POST',headers:{authorization:'Bearer synthetic'},body:JSON.stringify({role:'admin',active:true,uid:'other'})});
it('activación ignora rol e identidad del cuerpo',async()=>{expect((await POST(req())).status).toBe(200);expect(state.created.mock.calls[0][0]).toBe('accounts/citizen');expect(state.created.mock.calls[0][1].role).toBe('citizen')});
it('activación no restaura cuentas deshabilitadas',async()=>{state.existing=true;expect((await POST(req())).status).toBe(403);expect(state.created).not.toHaveBeenCalled()});
/* La verificación del correo dejó de ser un requisito: había quien se
   registraba, no volvía a abrir ese buzón y se quedaba sin poder reportar. El
   perfil se activa igual, y verificar sigue ofreciéndose para recuperar la
   cuenta. */
it('activación no exige correo verificado',async()=>{state.verified=false;expect((await POST(req())).status).toBe(200);expect(state.created.mock.calls[0][1].role).toBe('citizen')});

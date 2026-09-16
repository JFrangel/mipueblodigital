import {afterEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({member:vi.fn(),previous:{} as Record<string,unknown>}));
vi.mock('../../src/server/admin-auth',()=>({requireMember:mocks.member,ApiError:class extends Error {constructor(public status:number,message:string){super(message);}}}));
import {POST} from '../../src/app/api/ai/improve/route';
function setup(){
 vi.stubEnv('OPENROUTER_API_KEY','synthetic');vi.stubEnv('OPENROUTER_MODEL','test/free:free');
 mocks.member.mockResolvedValue({uid:'test',identity:{email_verified:true},db:{doc:()=>({}),runTransaction:async(fn: (tx:unknown)=>Promise<void>)=>fn({get:async()=>({data:()=>mocks.previous}),set:()=>{}})}});
}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();mocks.previous={};});
const request=()=>new Request('http://localhost/api/ai/improve',{method:'POST',body:JSON.stringify({text:'El muelle tiene varias tablas sueltas.'})});
it('IA exige correo verificado sin llamar al proveedor',async()=>{
 setup();mocks.member.mockResolvedValue({identity:{email_verified:false}});const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 expect((await POST(request())).status).toBe(403);expect(fetch).not.toHaveBeenCalled();
});
it('IA aplica cupo diario antes del proveedor',async()=>{
 setup();mocks.previous={day:new Date().toISOString().slice(0,10),count:10};const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 expect((await POST(request())).status).toBe(429);expect(fetch).not.toHaveBeenCalled();
});
it('IA devuelve propuesta y solo envía relato',async()=>{
 setup();const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:'El muelle presenta varias tablas sueltas.'}}]})));vi.stubGlobal('fetch',fetch);
 const response=await POST(request());expect(response.status).toBe(200);
 expect((await response.json()).suggestion).toContain('tablas');
 const sent=JSON.parse(fetch.mock.calls[0][1].body);expect(JSON.parse(sent.messages[1].content)).toEqual({relato:'El muelle tiene varias tablas sueltas.'});
});
it('IA rechaza salida vacía',async()=>{
 setup();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:''}}]}))));
 expect((await POST(request())).status).toBe(502);
});

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

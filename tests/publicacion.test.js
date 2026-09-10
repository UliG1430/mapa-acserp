import test from 'node:test';
import assert from 'node:assert/strict';
import {abrirDB} from '../server/sqlite.js';
import {api} from '../server/api.js';
import seed from '../data/inicial.json' with {type:'json'};
const origin='http://localhost:5173';
function harness(){const DB=abrirDB(':memory:');const env={DB,LOCAL_USER:'pedro'};return{DB,env,async call(path,method='GET',body,overrides={}){return api(new Request(origin+path,{method,headers:{'Origin':origin,'Content-Type':'application/json',...overrides.headers},body:body?JSON.stringify(body):undefined}),{...env,...overrides.env},{resolveUser:async()=>{const id=overrides.env&&'LOCAL_USER' in overrides.env?overrides.env.LOCAL_USER:env.LOCAL_USER;return id?{id}:null;}});}};}
const copy=()=>structuredClone(seed);
function change(name='Nombre corregido'){const d=copy();d.LUGARES[0].nombre=name;return d;}
test('publicación persistente, idempotencia, snapshots públicos sin identidad y rollback',async()=>{
 const h=harness();try{
 let r=await h.call('/public/version.json');assert.equal((await r.json()).revision,'inicial');
 const key=crypto.randomUUID(),datos=change();const body={key,baseRevision:'inicial',datos};
 r=await h.call('/api/publish','POST',body);assert.equal(r.status,201);const pub=await r.json();
 r=await h.call('/api/publish','POST',body);assert.equal((await r.json()).revision,pub.revision);
 r=await h.call('/public/revisions/'+pub.revision+'.json','GET',null,{env:{LOCAL_USER:null}});assert.equal(r.status,200);const snapshot=await r.json();assert.equal(snapshot.datos.LUGARES[0].nombre,'Nombre corregido');assert.equal(snapshot.autor,undefined);assert.match(r.headers.get('cache-control'),/immutable/);
 r=await h.call('/api/publish','POST',{...body,datos:change('otro')});assert.equal(r.status,409);
 r=await h.call('/api/publish','POST',{key:crypto.randomUUID(),baseRevision:pub.revision,datos:seed});assert.equal(r.status,201);
 const history=await(await h.call('/api/history')).json();assert.equal(history.length,2);
 }finally{h.DB.close();}
});
test('dos editores no pueden publicar sobre una misma base',async()=>{const h=harness();try{const results=await Promise.all(['uno','dos'].map((name)=>h.call('/api/publish','POST',{key:crypto.randomUUID(),baseRevision:'inicial',datos:change(name)},{env:{LOCAL_USER:name}})));assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);}finally{h.DB.close();}});
test('borradores privados con control de versión entre pestañas',async()=>{const h=harness();try{
 let r=await h.call('/api/draft','PUT',{version:0,baseRevision:'inicial',datos:copy()});assert.equal(r.status,200);assert.equal((await r.json()).version,1);
 r=await h.call('/api/draft','PUT',{version:0,baseRevision:'inicial',datos:change()});assert.equal(r.status,409);
 r=await h.call('/api/draft','PUT',{version:1,baseRevision:'inicial',datos:change()});assert.equal((await r.json()).version,2);
 const other=await(await h.call('/api/draft','GET',null,{env:{LOCAL_USER:'otro'}})).json();assert.equal(other,null);
 r=await h.call('/api/draft','PUT',{version:5,baseRevision:'inicial',datos:copy()},{env:{LOCAL_USER:'nuevo'}});assert.equal(r.status,409);
 }finally{h.DB.close();}});
test('escritura sin permisos o desde otro origen rechazada',async()=>{const h=harness();try{
 assert.equal((await h.call('/api/draft','PUT',{},{env:{LOCAL_USER:null}})).status,401);
 assert.equal((await h.call('/api/draft','PUT',{},{headers:{Origin:'https://otro.example'}})).status,403);
 assert.equal((await h.call('/api/draft','GET',null,{env:{LOCAL_USER:null,AUTH_MODE:'sites',EDITOR_EMAILS:'pedro@example.com'},headers:{'oai-authenticated-user-id':'123','oai-authenticated-user-email':'intruso@example.com'}})).status,401);
 assert.equal((await h.call('/api/draft','GET',null,{env:{LOCAL_USER:null,AUTH_MODE:'sites',EDITOR_EMAILS:'pedro@example.com'},headers:{'oai-authenticated-user-id':'123','oai-authenticated-user-email':'pedro@example.com'}})).status,401);
 }finally{h.DB.close();}});
test('preview privada e inmutable, no cambia la publicación',async()=>{const h=harness();try{const r=await h.call('/api/preview','POST',{datos:change()});const{id}=await r.json();assert.equal((await h.call('/api/preview/'+id)).status,200);assert.equal((await h.call('/api/preview/'+id,'GET',null,{env:{LOCAL_USER:'otro'}})).status,404);assert.equal((await(await h.call('/public/version.json')).json()).revision,'inicial');}finally{h.DB.close();}});
test('contenido inválido no altera la publicación',async()=>{const h=harness();try{const datos=copy();datos.LUGARES[0].x=-1;assert.equal((await h.call('/api/publish','POST',{key:crypto.randomUUID(),baseRevision:'inicial',datos})).status,400);assert.equal((await(await h.call('/public/version.json')).json()).revision,'inicial');}finally{h.DB.close();}});

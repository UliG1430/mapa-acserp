import test from 'node:test';
import assert from 'node:assert/strict';
import {crearBlobDB} from '../server/blob-db.js';

function memoryStore(){let value=null,etag=0;return{async getWithMetadata(){return value===null?null:{data:structuredClone(value),etag:String(etag)};},async setJSON(key,next,options={}){if((options.onlyIfNew&&value!==null)||(options.onlyIfMatch&&options.onlyIfMatch!==String(etag)))return{modified:false};value=structuredClone(next);etag++;return{modified:true,etag:String(etag)};}};}

test('adaptador Blob conserva concurrencia de borradores, publicaciones y sesiones',async()=>{
 const db=crearBlobDB(memoryStore()),draft='INSERT INTO borradores (autor,version,base_revision,datos,fecha) SELECT ?,1,?,?,? WHERE (?=0 OR EXISTS (SELECT 1 FROM borradores WHERE autor=?)) ON CONFLICT(autor) DO UPDATE SET version=borradores.version+1,base_revision=excluded.base_revision,datos=excluded.datos,fecha=excluded.fecha WHERE borradores.version=?';
 assert.equal((await db.prepare(draft).bind('u','inicial','{}','fecha',0,'u',0).run()).meta.changes,1);
 assert.equal((await db.prepare(draft).bind('u','inicial','{"viejo":true}','fecha',0,'u',0).run()).meta.changes,0);
 assert.equal((await db.prepare('SELECT * FROM borradores WHERE autor=?').bind('u').first()).version,1);
 const publish='INSERT INTO publicaciones (revision,base_revision,datos,autor,fecha,clave,resumen) SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT revision FROM publicaciones ORDER BY seq DESC LIMIT 1),\'inicial\')=?';
 assert.equal((await db.prepare(publish).bind('r1','inicial','{}','u','fecha','k1','[]','inicial').run()).meta.changes,1);
 assert.equal((await db.prepare(publish).bind('r2','inicial','{}','u','fecha','k2','[]','inicial').run()).meta.changes,0);
 assert.equal((await db.prepare('SELECT * FROM publicaciones ORDER BY seq DESC LIMIT 1').first()).revision,'r1');
 await db.prepare('INSERT INTO sesiones (hash,autor,email,token,vence) VALUES (?,?,?,?,?)').bind('h','u','u@example.org','cifrado',Date.now()+1000).run();
 assert.equal((await db.prepare('SELECT * FROM sesiones WHERE hash=? AND vence>?').bind('h',Date.now()).first()).autor,'u');
});

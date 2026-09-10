import {authRoute,resolveUser,rateLimit} from './auth.js';
import {json,body,sameOrigin,HttpError} from './http.js';
import inicial from '../data/inicial.json' with {type:'json'};
import { validarDatos,resumenCambios } from '../js/validacion.js';
const seed=validarDatos(inicial);
export const PUBLIC_CACHE='public, max-age=0, s-maxage=5, must-revalidate';
export async function vigente(db){return await db.prepare('SELECT * FROM publicaciones ORDER BY seq DESC LIMIT 1').first()||{revision:'inicial',fecha:null,datos:JSON.stringify(seed)};}
export async function api(request,env,context={}){
  const u=new URL(request.url),p=u.pathname,db=env.DB;
  try{
    if(request.method==='GET'&&p==='/public/version.json'){const r=await db.prepare('SELECT revision,fecha FROM publicaciones ORDER BY seq DESC LIMIT 1').first()||{revision:'inicial',fecha:null};return json({revision:r.revision,publishedAt:r.fecha},200,PUBLIC_CACHE);}
    if(request.method==='GET'&&/^\/public\/revisions\/(inicial|[a-f0-9-]{36})\.json$/.test(p)){
      const revision=p.split('/').pop().replace('.json','');const r=revision==='inicial'?{revision,fecha:null,datos:JSON.stringify(seed)}:await db.prepare('SELECT revision,fecha,datos FROM publicaciones WHERE revision=?').bind(revision).first();
      return r?json({revision:r.revision,publishedAt:r.fecha,datos:JSON.parse(r.datos)},200,'public, max-age=31536000, immutable'):json({error:'Versión no encontrada.'},404);
    }
    const authResponse=await authRoute(request,env,context);if(authResponse)return authResponse;
    const identity=await (context.resolveUser||resolveUser)(request,env,context);
    const user=identity?.id;
    if(!user)return json({error:'Ingresá con una cuenta autorizada para editar.'},401);
    if(!['GET','HEAD'].includes(request.method)){sameOrigin(request);await rateLimit(db,'write:'+user,120,60);}
    if(p==='/api/current'&&request.method==='GET'){const r=await vigente(db);return json({revision:r.revision,publishedAt:r.fecha,datos:JSON.parse(r.datos)});}
    if(p==='/api/draft'&&request.method==='GET'){const r=await db.prepare('SELECT * FROM borradores WHERE autor=?').bind(user).first();return json(r?{version:r.version,baseRevision:r.base_revision,datos:JSON.parse(r.datos),savedAt:r.fecha}:null);}
    if(p==='/api/draft'&&request.method==='PUT'){
      const b=await body(request);const datos=validarDatos(b.datos);if(typeof b.baseRevision!=='string'||!Number.isInteger(b.version)||b.version<0)return json({error:'Versión de borrador inválida.'},400);
      if(b.baseRevision!=='inicial'&&!await db.prepare('SELECT revision FROM publicaciones WHERE revision=?').bind(b.baseRevision).first())throw new HttpError(400,'La versión base no existe.');
      const date=new Date().toISOString();
      const r=await db.prepare(`INSERT INTO borradores (autor,version,base_revision,datos,fecha) SELECT ?,1,?,?,? WHERE (?=0 OR EXISTS (SELECT 1 FROM borradores WHERE autor=?)) ON CONFLICT(autor) DO UPDATE SET version=borradores.version+1,base_revision=excluded.base_revision,datos=excluded.datos,fecha=excluded.fecha WHERE borradores.version=?`).bind(user,b.baseRevision,JSON.stringify(datos),date,b.version,user,b.version).run();
      if(!r.meta.changes)return json({error:'El borrador cambió en otra pestaña. Descargá tu copia y recuperá el borrador guardado.'},409);
      return json({version:b.version+1,savedAt:date});
    }
    if(p==='/api/history'&&request.method==='GET'){const r=await db.prepare('SELECT revision,base_revision,fecha,resumen FROM publicaciones ORDER BY seq DESC LIMIT 50').all();return json(r.results.map(r=>({revision:r.revision,baseRevision:r.base_revision,publishedAt:r.fecha,resumen:JSON.parse(r.resumen)})));}
    if(p==='/api/preview'&&request.method==='POST'){const b=await body(request),datos=validarDatos(b.datos),id=crypto.randomUUID();await db.prepare('INSERT INTO previews (id,autor,datos,fecha) VALUES (?,?,?,?)').bind(id,user,JSON.stringify(datos),new Date().toISOString()).run();await db.prepare('DELETE FROM previews WHERE fecha < ?').bind(new Date(Date.now()-86400000).toISOString()).run();return json({id});}
    if(p.startsWith('/api/preview/')&&request.method==='GET'){const r=await db.prepare('SELECT datos FROM previews WHERE id=? AND autor=? AND fecha>?').bind(p.split('/').pop(),user,new Date(Date.now()-86400000).toISOString()).first();return r?json({revision:'preview',publishedAt:null,datos:JSON.parse(r.datos)}):json({error:'Esta vista previa venció o pertenece a otra cuenta.'},404);}
    if(p==='/api/publish'&&request.method==='POST'){
      const b=await body(request);if(typeof b.key!=='string'||!/^[a-f0-9-]{36}$/.test(b.key)||typeof b.baseRevision!=='string')return json({error:'Solicitud inválida.'},400);
      const datos=validarDatos(b.datos),serialized=JSON.stringify(datos);
      const previous=await db.prepare('SELECT revision,fecha,datos,base_revision FROM publicaciones WHERE autor=? AND clave=?').bind(user,b.key).first();
      if(previous){if(previous.datos!==serialized||previous.base_revision!==b.baseRevision)return json({error:'La clave de publicación ya se usó con otro contenido.'},409);return json({revision:previous.revision,publishedAt:previous.fecha});}
      const current=await vigente(db);if(current.revision!==b.baseRevision)return json({error:'Ya hay una publicación más nueva. Revisá las diferencias antes de aplicar.',revision:current.revision},409);
      const summary=resumenCambios(JSON.parse(current.datos),datos);if(!summary.length)return json({error:'No hay cambios para publicar.'},400);
      const revision=crypto.randomUUID(),date=new Date().toISOString();
      const result=await db.prepare(`INSERT INTO publicaciones (revision,base_revision,datos,autor,fecha,clave,resumen) SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT revision FROM publicaciones ORDER BY seq DESC LIMIT 1),'inicial')=?`).bind(revision,b.baseRevision,serialized,user,date,b.key,JSON.stringify(summary),b.baseRevision).run();
      if(!result.meta.changes){const retry=await db.prepare('SELECT revision,fecha,datos,base_revision FROM publicaciones WHERE autor=? AND clave=?').bind(user,b.key).first();if(retry&&retry.datos===serialized&&retry.base_revision===b.baseRevision)return json({revision:retry.revision,publishedAt:retry.fecha});return json({error:'Otra persona publicó al mismo tiempo. Revisá la última versión.'},409);}
      return json({revision,publishedAt:date},201);
    }
    return json({error:'Ruta no encontrada.'},404);
  }catch(e){const dbError=e.code||/SQLITE|D1_|no such table|database/i.test(e.message);if(dbError)console.error('Fallo de almacenamiento:',e.code||e.name);return json({error:dbError?'No se pudo completar la operación. Tus cambios siguen en el borrador.':e.message||'Solicitud inválida.'},dbError?503:e.status||400);}
}

import {HttpError,json,body,sameOrigin} from './http.js';
const encoder=new TextEncoder();
const ALLOW_DEFAULT='modeloonulp@gmail.com';
const allowed=(email,env)=>(env.EDITOR_EMAILS||ALLOW_DEFAULT).split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(email?.toLowerCase());
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=s=>Uint8Array.from(s.match(/../g)||[],c=>parseInt(c,16));
export const hash=async value=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
function cookieName(local){return local?'mapa_local_session':'__Host-mapa_session';}
function sessionToken(req,local){return (req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName(local)+'='))?.split('=')[1];}
function sessionCookie(token,local,maxAge=1800){return `${cookieName(local)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${local?'':'; Secure'}`;}
async function key(env){if(!/^[a-f0-9]{64}$/i.test(env.SESSION_ENCRYPTION_KEY||''))throw new HttpError(503,'El acceso todavía no está configurado.');return crypto.subtle.importKey('raw',fromHex(env.SESSION_ENCRYPTION_KEY),'AES-GCM',false,['encrypt','decrypt']);}
async function encrypt(token,env){const iv=crypto.getRandomValues(new Uint8Array(12));return hex(iv)+':'+hex(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),encoder.encode(token))));}
async function decrypt(value,env){const [iv,data]=value.split(':');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromHex(iv)},await key(env),fromHex(data)));}
export async function rateLimit(db,bucket,limit,seconds){
 const now=Math.floor(Date.now()/1000),slot=Math.floor(now/seconds),id=await hash(bucket+':'+slot);
 const r=await db.prepare('INSERT INTO limites (id,intentos,vence) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET intentos=limites.intentos+1 WHERE limites.intentos<?').bind(id,(slot+1)*seconds,limit).run();
 if(!r.meta.changes)throw new HttpError(429,'Demasiados intentos. Esperá unos minutos antes de volver a intentar.');
 // Cada solicitud permitida limpia únicamente registros vencidos; tamaño acotado por límites de la plataforma.
 await db.prepare('DELETE FROM limites WHERE vence<?').bind(now).run();
}
function configured(env){return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL||'')&&!!env.SUPABASE_PUBLISHABLE_KEY&&/^[a-f0-9]{64}$/i.test(env.SESSION_ENCRYPTION_KEY||'');}
async function provider(env,path,method='GET',payload,token){
 if(!configured(env))throw new HttpError(503,'El inicio de sesión todavía no está conectado.');
 let r;try{r=await (env.AUTH_FETCH||fetch)(env.SUPABASE_URL+'/auth/v1/'+path,{method,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(8000)});}catch{throw new HttpError(503,'No se pudo contactar al servicio de acceso. Intentá de nuevo.');}
 if(!r.ok){if(r.status===429)throw new HttpError(429,'Esperá un momento antes de solicitar otro acceso.');if(r.status>=500)throw new HttpError(503,'El servicio de acceso no está disponible.');throw new HttpError(401,'Correo o contraseña incorrectos, o acceso no autorizado.');}
 return r.status===204?null:r.json();
}
// Solo se inspecciona AAL en tokens recibidos directamente del proveedor por HTTPS.
// Nunca se acepta un JWT del navegador como credencial del mapa.
function assurance(token){try{return JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).aal;}catch{return 'aal1';}}
const needsMfa=user=>user.factors?.some(f=>f.status==='verified');
async function startMfa(req,env,data,context){
 const factor=data.user.factors.find(f=>f.status==='verified'&&f.factor_type==='totp');
 if(!factor)throw new HttpError(403,'Esta cuenta requiere un segundo factor no compatible con este editor. Usá una cuenta autorizada con autenticador TOTP.');
 const challenge=await provider(env,'factors/'+encodeURIComponent(factor.id)+'/challenge','POST',{},data.access_token);
 if(!challenge.id)throw new HttpError(503,'No se pudo iniciar la verificación.');
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 await env.DB.prepare('DELETE FROM pendientes_mfa WHERE autor=? OR vence<?').bind(data.user.id,Date.now()).run();
 await env.DB.prepare('INSERT INTO pendientes_mfa (hash,autor,email,token,factor,challenge,vence) VALUES (?,?,?,?,?,?,?)').bind(await hash(token),data.user.id,data.user.email,await encrypt(data.access_token,env),factor.id,challenge.id,Date.now()+300000).run();
 const r=json({mfa:true});r.headers.set('Set-Cookie',sessionCookie(token,context.local,300));return r;
}
async function verifyMfa(req,env,context){
 const token=sessionToken(req,context.local);
 if(!token||!/^[a-f0-9]{64}$/.test(token))throw new HttpError(401,'Volvé a ingresar con tu correo y contraseña.');
 const id=await hash(token),row=await env.DB.prepare('SELECT * FROM pendientes_mfa WHERE hash=? AND vence>?').bind(id,Date.now()).first();
 if(!row||!allowed(row.email,env))throw new HttpError(401,'La verificación venció. Volvé a ingresar.');
 await rateLimit(env.DB,'mfa:'+row.autor,5,600);
 const b=await body(req,2048);if(typeof b.code!=='string'||!/^\d{6}$/.test(b.code))throw new HttpError(400,'Ingresá el código de seis dígitos.');
 let data;try{data=await provider(env,'factors/'+encodeURIComponent(row.factor)+'/verify','POST',{challenge_id:row.challenge,code:b.code},await decrypt(row.token,env));}catch(e){if(e.status===401)throw new HttpError(401,'Código incorrecto o vencido. Intentá de nuevo.');throw e;}
 const user=await provider(env,'user','GET',null,data.access_token);
 if(user.id!==row.autor||!user.email_confirmed_at||!allowed(user.email,env)||assurance(data.access_token)!=='aal2')throw new HttpError(403,'No se pudo verificar el segundo factor.');
 const consumed=await env.DB.prepare('DELETE FROM pendientes_mfa WHERE hash=? AND vence>?').bind(id,Date.now()).run();
 if(!consumed.meta.changes)throw new HttpError(401,'La verificación ya fue utilizada. Volvé a ingresar.');
 return createSession(req,env,user,data.access_token,data.expires_in,context);
}
export async function resolveUser(req,env,context={}){
 const token=sessionToken(req,context.local);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=await env.DB.prepare('SELECT * FROM sesiones WHERE hash=? AND vence>?').bind(await hash(token),Date.now()).first();if(!row)return null;
 if(context.local && row.token==='local')return {id:row.autor,email:row.email};
 if(!allowed(row.email,env))return null;
 let access;try{access=await decrypt(row.token,env);}catch{return null;}
 let user;try{user=await provider(env,'user','GET',null,access);}catch(e){if(e.status===503)throw e;return null;}
 if(needsMfa(user)&&assurance(access)!=='aal2')return null;
 return user.id===row.autor&&user.email_confirmed_at&&allowed(user.email,env)?{id:user.id,email:user.email}:null;
}
async function createSession(req,env,user,access,expiresIn,context){
 const old=sessionToken(req,context.local);if(old)await env.DB.prepare('DELETE FROM sesiones WHERE hash=?').bind(await hash(old)).run();
 const token=hex(crypto.getRandomValues(new Uint8Array(32))),age=Math.min(1800,Math.max(0,Number(expiresIn)||0));if(age<60)throw new HttpError(401,'El acceso venció. Volvé a ingresar.');
 await env.DB.prepare('INSERT INTO sesiones (hash,autor,email,token,vence) VALUES (?,?,?,?,?)').bind(await hash(token),user.id,user.email,context.local&&!access?'local':await encrypt(access,env),Date.now()+age*1000).run();
 await env.DB.prepare('DELETE FROM sesiones WHERE vence<?').bind(Date.now()).run();
 const r=json({ok:true});r.headers.set('Set-Cookie',sessionCookie(token,context.local,age));return r;
}
export async function authRoute(req,env,context={}){
 const path=new URL(req.url).pathname;
 if(path==='/api/session'&&req.method==='GET'){const user=await resolveUser(req,env,context);return json({editor:!!user,editorId:user?.id||null,email:user?.email||null,local:!!context.local,configured:context.local||configured(env),signin:'/admin'});}
 if(!path.startsWith('/api/auth/'))return null;
 if(req.method!=='POST')return json({error:'Método no permitido.'},405);sameOrigin(req);
 if(path==='/api/auth/logout'){const token=sessionToken(req,context.local);if(token){await env.DB.prepare('DELETE FROM sesiones WHERE hash=?').bind(await hash(token)).run();await env.DB.prepare('DELETE FROM pendientes_mfa WHERE hash=?').bind(await hash(token)).run();}const r=json({ok:true});r.headers.set('Set-Cookie',sessionCookie('',context.local,0));return r;}
 await rateLimit(env.DB,'auth-ip:'+(context.clientIP||req.headers.get('cf-connecting-ip')||'unknown'),30,600);
 if(path==='/api/auth/local'){if(!context.local)return json({error:'No encontrado.'},404);return createSession(req,env,{id:'editor-local',email:ALLOW_DEFAULT},null,1800,context);}
 if(path==='/api/auth/mfa')return verifyMfa(req,env,context);
 const b=await body(req,2048),email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new HttpError(400,'Ingresá un correo válido.');
 if(path==='/api/auth/login'){
   await rateLimit(env.DB,'auth-login:'+email,5,600);
   if(!allowed(email,env)||typeof b.password!=='string'||b.password.length<1||b.password.length>128)throw new HttpError(401,'Correo o contraseña incorrectos, o acceso no autorizado.');
   const data=await provider(env,'token?grant_type=password','POST',{email,password:b.password});
   if(!data.user?.id||!data.user.email_confirmed_at||data.user.email?.toLowerCase()!==email||!allowed(data.user.email,env))throw new HttpError(403,'Esta cuenta no está autorizada.');
   if(needsMfa(data.user)&&assurance(data.access_token)!=='aal2')return startMfa(req,env,data,context);
   return createSession(req,env,data.user,data.access_token,data.expires_in,context);
 }
 return json({error:'No encontrado.'},404);
}

export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
export function json(body,status=200,cache='no-store'){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':cache,'X-Content-Type-Options':'nosniff'}});}
export async function body(req,max=512000){
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'Enviá datos JSON.');
 if(Number(req.headers.get('content-length'))>max)throw new HttpError(413,'El contenido es demasiado grande.');
 const reader=req.body?.getReader();let size=0;const chunks=[];if(!reader)throw new HttpError(400,'Faltan datos.');
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new HttpError(413,'El contenido es demasiado grande.');}chunks.push(value);}
 const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}
 try{const value=JSON.parse(new TextDecoder().decode(all));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new HttpError(400,'El contenido JSON no es válido.');}
}
export function sameOrigin(req){if(req.headers.get('origin')!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'Origen no autorizado.');}
export function headersSeguridad(response,request){const r=new Response(response.body,response);const h=r.headers;
 h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','no-referrer');h.set('X-Frame-Options','DENY');
 h.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 h.set('Permissions-Policy','camera=(), microphone=(), geolocation=(self)');
 if(new URL(request.url).protocol==='https:')h.set('Strict-Transport-Security','max-age=31536000');return r;
}

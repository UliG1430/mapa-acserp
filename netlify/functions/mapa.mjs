import {getStore} from '@netlify/blobs';
import {api} from '../../server/api.js';
import {crearBlobDB} from '../../server/blob-db.js';
import {headersSeguridad} from '../../server/http.js';

export default async function handler(request,context){
  const DB=crearBlobDB(getStore({name:'mapa-acserp',consistency:'strong'}));
  const response=await api(request,{...process.env,DB},{clientIP:context.ip||request.headers.get('x-nf-client-connection-ip')||'unknown'});
  return headersSeguridad(response,request);
}

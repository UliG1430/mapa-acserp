// Solo lectura. La URL debe ser loopback para no generar carga en un sitio ajeno.
import {performance} from 'node:perf_hooks';
const base=new URL(process.env.MAPA_LOAD_URL||'http://127.0.0.1:5173');
if(!['localhost','127.0.0.1'].includes(base.hostname))throw new Error('La prueba de carga solo admite localhost.');
const count=3000,concurrency=100;const times=[];let next=0,errors=0;const start=performance.now();
await Promise.all(Array.from({length:concurrency},async()=>{while(next<count){const n=next++;const t=performance.now();try{const r=await fetch(new URL(n%10===0?'public/revisions/inicial.json':'public/version.json',base),{signal:AbortSignal.timeout(10000)});if(!r.ok)errors++;await r.arrayBuffer();}catch{errors++;}times.push(performance.now()-t);}}));
times.sort((a,b)=>a-b);const elapsed=(performance.now()-start)/1000;
console.log(JSON.stringify({requests:count,concurrency,errors,seconds:Number(elapsed.toFixed(2)),requestsPerSecond:Math.round(count/elapsed),p50ms:Math.round(times[Math.floor(times.length*.5)]),p95ms:Math.round(times[Math.floor(times.length*.95)]),scope:'Servidor local; no mide CDN ni la red del predio.'},null,2));if(errors)process.exitCode=1;

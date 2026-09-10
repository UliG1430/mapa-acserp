import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../data/inicial.json' with {type:'json'};
import {validarDatos} from '../js/validacion.js';
import {mezclar} from '../js/mezclar.js';
import {svgQR} from '../js/qr.js';
import {aFecha,fechaLocal,estadoEn,todosLosBloques} from '../js/cronograma.js';
import {buscar} from '../js/buscador.js';
import {aplicarSnapshot} from '../js/datos.js';
const copy=()=>structuredClone(seed);
test('valida datos y referencias sin ejecutar contenido',()=>{assert.equal(validarDatos(copy()).ORGANOS.length,15);for(const mutate of [d=>d.LUGARES[0].nombre='',d=>d.LUGARES[0].x=NaN,d=>d.ORGANOS[0].sedeId='inexistente',d=>d.CRONOGRAMA[0].bloques[0].hasta='01:00',d=>d.INFO[0].enlaces=[{texto:'mal',url:'javascript:alert(1)'}]]){const d=copy();mutate(d);assert.throws(()=>validarDatos(d));}});
test('QR escapa atributos sin alterar la cadena codificada',()=>{const svg=svgQR('https://example.com/" onclick="x');assert.ok(svg.includes('&quot;'));assert.ok(!svg.includes('" onclick="'));});
test('mezcla independiente y resolución explícita',()=>{const b=copy(),m=copy(),p=copy();m.LUGARES[0].nombre='Mío';p.LUGARES[1].nombre='Publicado';let r=mezclar(b,m,p);assert.equal(r.conflictos.length,0);assert.equal(r.datos.LUGARES[0].nombre,'Mío');assert.equal(r.datos.LUGARES[1].nombre,'Publicado');p.LUGARES[0].nombre='Otro';r=mezclar(b,m,p);assert.equal(r.conflictos.length,1);assert.equal(mezclar(b,m,p,{'LUGARES/domo':'mio'}).datos.LUGARES[0].nombre,'Mío');});
test('hora de Argentina y cambio de fecha independiente del dispositivo',()=>{assert.equal(aFecha('2026-09-22','17:00').toISOString(),'2026-09-22T20:00:00.000Z');assert.equal(fechaLocal(new Date('2026-09-23T01:00:00Z')),'2026-09-22');assert.equal(estadoEn(new Date('2026-09-22T20:30:00Z')).actual.todos,'Acreditaciones');});
test('nueva revisión invalida búsqueda y cronograma',()=>{buscar('domo');const d=copy();d.LUGARES[0].nombre='Sala Pedro';d.CRONOGRAMA[0].bloques[0].todos='Recepción nueva';aplicarSnapshot({revision:'test',publishedAt:null,datos:d},false);assert.ok(buscar('Sala Pedro').length);assert.equal(todosLosBloques()[0].todos,'Recepción nueva');aplicarSnapshot({revision:'inicial',publishedAt:null,datos:copy()},false);});

test('mover un órgano solo modifica ese órgano, incluso sin sedeId',async()=>{const{moverEntidad}=await import('../js/editar-datos.js');const d=copy();const before=copy();const o=d.ORGANOS.find(o=>o.sigla==='STI');moverEntidad(d,o,.2,.3);for(const original of before.ORGANOS){const actual=d.ORGANOS.find(o=>o.sigla===original.sigla);if(original.sigla==='STI'){assert.equal(actual.x,.2);assert.equal(actual.y,.3);}else assert.deepEqual(actual,original);}});
test('mover un edificio solo desplaza los órganos vinculados a ese edificio',async()=>{const{moverEntidad}=await import('../js/editar-datos.js');const d=copy();const before=copy();const building=d.LUGARES.find(p=>p.id==='domo');moverEntidad(d,building,building.x+.01,building.y+.01);for(const o of d.ORGANOS){const prev=before.ORGANOS.find(x=>x.sigla===o.sigla);if(o.sedeId==='domo')assert.ok(Math.abs(o.x-prev.x-.01)<1e-10);else assert.deepEqual(o,prev);}});
test('órganos nuevos y nombres editados son válidos; siglas peligrosas y duplicadas no',()=>{const d=copy();d.ORGANOS.push({sigla:'NUEVO',nombre:'Órgano nuevo',sede:'Sede a confirmar',track:'asamblearios',nota:'',x:.5,y:.5});assert.equal(validarDatos(d).ORGANOS.length,16);d.ORGANOS.at(-1).sigla='../mal';assert.throws(()=>validarDatos(d));d.ORGANOS.at(-1).sigla='AG';assert.throws(()=>validarDatos(d));});

import {esc} from './seguridad.js';
const LOGOS=new Set(['AG','STI','CS','ECOSOC','CDH','ONUM','PNUMA','UNESCO','ACNUR','UNICEF','OMS','CAJ','OIT','ONUDD','UNODA']);
export function colorOrgano(sigla){return LOGOS.has(sigla)?`var(--c-${sigla.toLowerCase()})`:'var(--c-minulp)';}
export function logoOrgano(sigla,clase=''){return LOGOS.has(sigla)?`<img class="${esc(clase)}" src="img/logos/${sigla}.webp" alt="" width="192" height="192">`:`<span class="organo-iniciales ${esc(clase)}" aria-hidden="true">${esc(sigla)}</span>`;}

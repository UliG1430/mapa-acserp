import {validarDatos} from './validacion.js';
export function exportarDatos(datos){return JSON.stringify(validarDatos(datos),null,2)+'\n';}

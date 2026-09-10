import {readdir,readFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {validarDatos} from '../js/validacion.js';
let count=0;for(const dir of ['js','server','scripts','tests'])for(const name of await readdir(dir)){if(!name.endsWith('.js'))continue;const p=path.join(dir,name);const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);count++;}
validarDatos(JSON.parse(await readFile('data/inicial.json','utf8')));
for(const p of ['index.html','editor.html','imprimir.html','login.html']){const html=await readFile(p,'utf8');for(const m of html.matchAll(/(?:src|href)="([^"#?]+)"/g)){const url=m[1];if(url.includes('://')||url.startsWith('/'))continue;await stat(url);}const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw new Error('IDs duplicados: '+p);}
console.log(`${count} archivos JavaScript, datos y referencias HTML verificados.`);

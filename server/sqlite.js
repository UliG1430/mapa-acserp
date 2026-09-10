import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function abrirDB(filename){
  const db=new DatabaseSync(filename);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');db.exec('CREATE TABLE IF NOT EXISTS _migraciones (nombre TEXT PRIMARY KEY)');
  const dir=new URL('../drizzle/',import.meta.url);
  for(const name of readdirSync(dir).filter(n=>n.endsWith('.sql')).sort()){
    if(db.prepare('SELECT nombre FROM _migraciones WHERE nombre=?').get(name))continue;
    let sql=readFileSync(new URL(name,dir),'utf8');
    // Compatibilidad con la primera prueba local, que ya creó estas tres tablas.
    if(name.startsWith('0000_'))sql=sql.replaceAll('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ').replaceAll('CREATE UNIQUE INDEX ','CREATE UNIQUE INDEX IF NOT EXISTS ');
    db.exec('BEGIN');try{db.exec(sql);db.prepare('INSERT INTO _migraciones(nombre) VALUES (?)').run(name);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  }
  return {close:()=>db.close(),prepare(sql){let params=[];const stmt={bind(...values){params=values;return stmt;},async first(){return db.prepare(sql).get(...params)||null;},async all(){return {results:db.prepare(sql).all(...params)};},async run(){const r=db.prepare(sql).run(...params);return {meta:{changes:Number(r.changes)}};}};return stmt;}};
}

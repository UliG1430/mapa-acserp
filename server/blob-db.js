const EMPTY_STATE=()=>({publicaciones:[],borradores:{},previews:{},sesiones:{},pendientes_mfa:{},limites:{}});
const normalized=sql=>sql.replace(/\s+/g,' ').trim();

export function crearBlobDB(store,{key='state-v1',retries=8}={}){
  async function load(){
    const entry=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
    return entry?{state:{...EMPTY_STATE(),...entry.data},etag:entry.etag}:{state:EMPTY_STATE(),etag:null};
  }
  async function change(mutator){
    for(let attempt=0;attempt<retries;attempt++){
      const {state,etag}=await load(),changes=mutator(state);
      if(!changes)return {meta:{changes:0}};
      const result=await store.setJSON(key,state,etag?{onlyIfMatch:etag}:{onlyIfNew:true});
      if(result.modified)return {meta:{changes}};
    }
    const error=new Error('No se pudo guardar por escrituras simultáneas.');error.code='BLOB_CONFLICT';throw error;
  }
  return {close(){},prepare(sql){
    const q=normalized(sql);let params=[];
    const statement={bind(...values){params=values;return statement;},async first(){
      const {state}=await load();
      if(q==='SELECT * FROM publicaciones ORDER BY seq DESC LIMIT 1'||q==='SELECT revision,fecha FROM publicaciones ORDER BY seq DESC LIMIT 1')return state.publicaciones.at(-1)||null;
      if(q==='SELECT revision,fecha,datos FROM publicaciones WHERE revision=?'||q==='SELECT revision FROM publicaciones WHERE revision=?')return state.publicaciones.find(row=>row.revision===params[0])||null;
      if(q==='SELECT * FROM borradores WHERE autor=?'||q==='SELECT datos FROM borradores')return q.includes('WHERE')?state.borradores[params[0]]||null:Object.values(state.borradores)[0]||null;
      if(q==='SELECT revision,fecha,datos,base_revision FROM publicaciones WHERE autor=? AND clave=?')return state.publicaciones.find(row=>row.autor===params[0]&&row.clave===params[1])||null;
      if(q==='SELECT datos FROM previews WHERE id=? AND autor=? AND fecha>?'){const row=state.previews[params[0]];return row&&row.autor===params[1]&&row.fecha>params[2]?row:null;}
      if(q==='SELECT * FROM pendientes_mfa WHERE hash=? AND vence>?'){const row=state.pendientes_mfa[params[0]];return row&&row.vence>params[1]?row:null;}
      if(q==='SELECT * FROM sesiones WHERE hash=? AND vence>?'){const row=state.sesiones[params[0]];return row&&row.vence>params[1]?row:null;}
      throw new Error('Consulta Blob no soportada: '+q);
    },async all(){
      const {state}=await load();
      if(q==='SELECT revision,base_revision,fecha,resumen FROM publicaciones ORDER BY seq DESC LIMIT 50')return {results:state.publicaciones.slice(-50).reverse()};
      throw new Error('Consulta Blob no soportada: '+q);
    },async run(){
      if(q.startsWith('INSERT INTO borradores '))return change(state=>{const [autor,base_revision,datos,fecha,version]=params,current=state.borradores[autor];if((current&&current.version!==version)||(!current&&version!==0))return 0;state.borradores[autor]={autor,version:version+1,base_revision,datos,fecha};return 1;});
      if(q==='INSERT INTO previews (id,autor,datos,fecha) VALUES (?,?,?,?)')return change(state=>{const [id,autor,datos,fecha]=params;state.previews[id]={id,autor,datos,fecha};return 1;});
      if(q==='DELETE FROM previews WHERE fecha < ?')return change(state=>{let n=0;for(const [id,row] of Object.entries(state.previews))if(row.fecha<params[0]){delete state.previews[id];n++;}return n;});
      if(q.startsWith('INSERT INTO publicaciones '))return change(state=>{const [revision,base_revision,datos,autor,fecha,clave,resumen,expected]=params,current=state.publicaciones.at(-1)?.revision||'inicial';if(current!==expected)return 0;state.publicaciones.push({seq:state.publicaciones.length+1,revision,base_revision,datos,autor,fecha,clave,resumen});return 1;});
      if(q.startsWith('INSERT INTO limites '))return change(state=>{const [id,vence,limit]=params,current=state.limites[id];if(current&&current.intentos>=limit)return 0;state.limites[id]={id,intentos:(current?.intentos||0)+1,vence};return 1;});
      if(q==='DELETE FROM limites WHERE vence<?')return change(state=>{let n=0;for(const [id,row] of Object.entries(state.limites))if(row.vence<params[0]){delete state.limites[id];n++;}return n;});
      if(q==='DELETE FROM pendientes_mfa WHERE autor=? OR vence<?')return change(state=>{let n=0;for(const [id,row] of Object.entries(state.pendientes_mfa))if(row.autor===params[0]||row.vence<params[1]){delete state.pendientes_mfa[id];n++;}return n;});
      if(q==='INSERT INTO pendientes_mfa (hash,autor,email,token,factor,challenge,vence) VALUES (?,?,?,?,?,?,?)')return change(state=>{const [hash,autor,email,token,factor,challenge,vence]=params;state.pendientes_mfa[hash]={hash,autor,email,token,factor,challenge,vence};return 1;});
      if(q==='DELETE FROM pendientes_mfa WHERE hash=? AND vence>?')return change(state=>{const row=state.pendientes_mfa[params[0]];if(!row||row.vence<=params[1])return 0;delete state.pendientes_mfa[params[0]];return 1;});
      if(q==='DELETE FROM pendientes_mfa WHERE hash=?')return change(state=>state.pendientes_mfa[params[0]]?(delete state.pendientes_mfa[params[0]],1):0);
      if(q==='DELETE FROM sesiones WHERE hash=?')return change(state=>state.sesiones[params[0]]?(delete state.sesiones[params[0]],1):0);
      if(q==='INSERT INTO sesiones (hash,autor,email,token,vence) VALUES (?,?,?,?,?)')return change(state=>{const [hash,autor,email,token,vence]=params;state.sesiones[hash]={hash,autor,email,token,vence};return 1;});
      if(q==='DELETE FROM sesiones WHERE vence<?')return change(state=>{let n=0;for(const [id,row] of Object.entries(state.sesiones))if(row.vence<params[0]){delete state.sesiones[id];n++;}return n;});
      throw new Error('Escritura Blob no soportada: '+q);
    }};return statement;
  }};
}

const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Mezcla por entidad: cambios independientes se conservan; nunca pisa conflictos.
export function mezclar(base,mio,publico,decisiones={}){
  const resultado=structuredClone(publico),conflictos=[];
  function elegir(a,b,c,path){if(equal(b,a))return c;if(equal(c,a)||equal(b,c))return b;if(decisiones[path])return decisiones[path]==='mio'?b:c;conflictos.push({path,anterior:a,mio:b,publico:c});return c;}
  for(const key of Object.keys(publico)){
    if(['LUGARES','ORGANOS'].includes(key)){
      const id=key==='LUGARES'?'id':'sigla';const maps=[base,mio,publico].map(d=>new Map(d[key].map(p=>[p[id],p])));
      const ids=new Set([...maps[2].keys(),...maps[1].keys()]);resultado[key]=[];
      for(const k of ids){const p=elegir(...maps.map(m=>m.get(k)),`${key}/${k}`);if(p)resultado[key].push(p);}
    }else resultado[key]=elegir(base[key],mio[key],publico[key],key);
  }return{datos:resultado,conflictos};
}

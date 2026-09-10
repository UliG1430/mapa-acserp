// Las operaciones de edición solo modifican la entidad elegida y referencias explícitas.
export function moverEntidad(datos,entidad,x,y){
  const dx=x-entidad.x,dy=y-entidad.y;entidad.x=x;entidad.y=y;
  if(!entidad.sigla && typeof entidad.id==='string')for(const o of datos.ORGANOS){
    if(o.sedeId===entidad.id){o.x=Math.min(1,Math.max(0,o.x+dx));o.y=Math.min(1,Math.max(0,o.y+dy));}
  }
}

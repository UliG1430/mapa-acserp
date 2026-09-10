import {sqliteTable,text,integer,uniqueIndex,index} from 'drizzle-orm/sqlite-core';
export const publicaciones=sqliteTable('publicaciones',{
 seq:integer('seq').primaryKey({autoIncrement:true}),revision:text('revision').notNull().unique(),baseRevision:text('base_revision').notNull().unique(),datos:text('datos').notNull(),autor:text('autor').notNull(),fecha:text('fecha').notNull(),clave:text('clave').notNull(),resumen:text('resumen').notNull()
},t=>[uniqueIndex('publicaciones_autor_clave').on(t.autor,t.clave)]);
export const borradores=sqliteTable('borradores',{autor:text('autor').primaryKey(),version:integer('version').notNull(),baseRevision:text('base_revision').notNull(),datos:text('datos').notNull(),fecha:text('fecha').notNull()});
export const previews=sqliteTable('previews',{id:text('id').primaryKey(),autor:text('autor').notNull(),datos:text('datos').notNull(),fecha:text('fecha').notNull()});

export const sesiones=sqliteTable('sesiones',{hash:text('hash').primaryKey(),autor:text('autor').notNull(),email:text('email').notNull(),token:text('token').notNull(),vence:integer('vence').notNull()},t=>[index('idx_sesiones_vence').on(t.vence)]);
export const limites=sqliteTable('limites',{id:text('id').primaryKey(),intentos:integer('intentos').notNull(),vence:integer('vence').notNull()},t=>[index('idx_limites_vence').on(t.vence)]);

export const pendientesMfa=sqliteTable('pendientes_mfa',{hash:text('hash').primaryKey(),autor:text('autor').notNull(),email:text('email').notNull(),token:text('token').notNull(),factor:text('factor').notNull(),challenge:text('challenge').notNull(),vence:integer('vence').notNull()},t=>[index('idx_mfa_vence').on(t.vence)]);

CREATE TABLE `borradores` (
	`autor` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`base_revision` text NOT NULL,
	`datos` text NOT NULL,
	`fecha` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `previews` (
	`id` text PRIMARY KEY NOT NULL,
	`autor` text NOT NULL,
	`datos` text NOT NULL,
	`fecha` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `publicaciones` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`revision` text NOT NULL,
	`base_revision` text NOT NULL,
	`datos` text NOT NULL,
	`autor` text NOT NULL,
	`fecha` text NOT NULL,
	`clave` text NOT NULL,
	`resumen` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publicaciones_revision_unique` ON `publicaciones` (`revision`);--> statement-breakpoint
CREATE UNIQUE INDEX `publicaciones_base_revision_unique` ON `publicaciones` (`base_revision`);--> statement-breakpoint
CREATE UNIQUE INDEX `publicaciones_autor_clave` ON `publicaciones` (`autor`,`clave`);
CREATE TABLE `limites` (
	`id` text PRIMARY KEY NOT NULL,
	`intentos` integer NOT NULL,
	`vence` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sesiones` (
	`hash` text PRIMARY KEY NOT NULL,
	`autor` text NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`vence` integer NOT NULL
);

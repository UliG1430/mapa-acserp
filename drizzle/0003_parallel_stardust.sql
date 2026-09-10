CREATE TABLE `pendientes_mfa` (
	`hash` text PRIMARY KEY NOT NULL,
	`autor` text NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`factor` text NOT NULL,
	`challenge` text NOT NULL,
	`vence` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_mfa_vence` ON `pendientes_mfa` (`vence`);
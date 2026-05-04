DROP INDEX "food_barcode_idx";--> statement-breakpoint
DROP INDEX "food_source_source_id_idx";--> statement-breakpoint
DROP INDEX "recipe_user_slug_idx";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "user_username_unique";--> statement-breakpoint
DROP INDEX "user_apple_id_unique";--> statement-breakpoint
ALTER TABLE `user` ALTER COLUMN "password_hash" TO "password_hash" text;--> statement-breakpoint
CREATE INDEX `food_barcode_idx` ON `food` (`barcode`);--> statement-breakpoint
CREATE INDEX `food_source_source_id_idx` ON `food` (`source`,`source_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_user_slug_idx` ON `recipe` (`user_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_apple_id_unique` ON `user` (`apple_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `apple_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_apple_private_email` integer DEFAULT false NOT NULL;
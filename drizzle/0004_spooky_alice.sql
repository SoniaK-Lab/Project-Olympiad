CREATE TABLE `coin_inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`sku` text NOT NULL,
	`equipped` integer DEFAULT 1 NOT NULL,
	`actor_id` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coin_inventory_member_sku` ON `coin_inventory` (`member_id`,`sku`);--> statement-breakpoint
CREATE TABLE `coin_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`amount` integer NOT NULL,
	`source_key` text NOT NULL,
	`label` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coin_ledger_member_source` ON `coin_ledger` (`member_id`,`source_key`);--> statement-breakpoint
CREATE TABLE `coin_wallets` (
	`member_id` text PRIMARY KEY NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`earned` integer DEFAULT 0 NOT NULL,
	`last_action_id` text,
	`updated` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);

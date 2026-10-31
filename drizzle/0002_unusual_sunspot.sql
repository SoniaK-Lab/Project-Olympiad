CREATE TABLE `call_peers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`member_id` text NOT NULL,
	`client` text NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `call_signals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`sender_client` text NOT NULL,
	`recipient_id` text NOT NULL,
	`recipient_client` text NOT NULL,
	`payload` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);

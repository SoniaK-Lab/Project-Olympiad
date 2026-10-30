CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`identity` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`mentor_id` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_identity_unique` ON `members` (`identity`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE TABLE `progress` (
	`member_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`mentor_id` text NOT NULL,
	`student_id` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`goal` text NOT NULL,
	`confirmed` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`mentor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);

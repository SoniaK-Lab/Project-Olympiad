CREATE TABLE `continuity_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`student_id` text,
	`mentor_id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`actor_id` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mentor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `continuity_reads` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`student_id` text NOT NULL,
	`seen_at` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `continuity_read_member_student` ON `continuity_reads` (`member_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `continuity_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`body` text NOT NULL,
	`level` integer,
	`created` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `continuity_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `assignment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`acting_as_id` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`acting_as_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`mentor_id` text NOT NULL,
	`student_id` text NOT NULL,
	`title` text NOT NULL,
	`instructions` text NOT NULL,
	`status` text DEFAULT 'assigned' NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`action_id` text,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`mentor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);

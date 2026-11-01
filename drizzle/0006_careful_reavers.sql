CREATE INDEX `continuity_entries_scope` ON `continuity_entries` (`mentor_id`,`kind`,`created`);--> statement-breakpoint
CREATE INDEX `continuity_entries_student` ON `continuity_entries` (`student_id`,`kind`,`created`);--> statement-breakpoint
CREATE INDEX `continuity_replies_entry` ON `continuity_replies` (`entry_id`,`created`);
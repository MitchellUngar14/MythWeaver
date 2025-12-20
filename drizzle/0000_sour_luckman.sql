CREATE TABLE "action_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"actor_id" uuid,
	"action_type" varchar(50),
	"payload" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "character_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid,
	"version" integer,
	"snapshot" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"world_id" uuid,
	"name" varchar(100) NOT NULL,
	"class" varchar(50),
	"race" varchar(50),
	"level" integer DEFAULT 1,
	"stats" jsonb NOT NULL,
	"inventory" jsonb DEFAULT '[]'::jsonb,
	"abilities" jsonb DEFAULT '[]'::jsonb,
	"backstory" text,
	"notes" text,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "combat_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"template_id" uuid,
	"character_id" uuid,
	"name" varchar(100) NOT NULL,
	"current_hp" integer,
	"max_hp" integer,
	"status_effects" jsonb DEFAULT '[]'::jsonb,
	"position" integer,
	"is_active" boolean DEFAULT true,
	"show_hp_to_players" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "dice_rolls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" uuid,
	"roll_type" varchar(20),
	"dice" varchar(50),
	"results" jsonb,
	"total" integer,
	"context" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enemy_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dm_id" uuid NOT NULL,
	"world_id" uuid,
	"name" varchar(100) NOT NULL,
	"stats" jsonb NOT NULL,
	"abilities" jsonb DEFAULT '[]'::jsonb,
	"description" text,
	"challenge_rating" varchar(10),
	"is_npc" boolean DEFAULT false,
	"default_hide_hp" boolean DEFAULT false,
	"location" varchar(200),
	"location_resource_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"session_number" integer DEFAULT 1,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"combat_round" integer DEFAULT 0,
	"current_turn_id" uuid,
	"current_location" varchar(200),
	"current_location_resource_id" uuid,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp,
	"is_online" boolean DEFAULT true,
	CONSTRAINT "session_participant_unique" UNIQUE("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"is_player" boolean DEFAULT false,
	"is_dm" boolean DEFAULT false,
	"avatar_url" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "world_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "world_members_unique" UNIQUE("world_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "world_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"is_player_visible" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "worlds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dm_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"room_key" varchar(6) NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "worlds_room_key_unique" UNIQUE("room_key")
);
--> statement-breakpoint
ALTER TABLE "action_log" ADD CONSTRAINT "action_log_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_log" ADD CONSTRAINT "action_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_history" ADD CONSTRAINT "character_history_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combat_instances" ADD CONSTRAINT "combat_instances_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combat_instances" ADD CONSTRAINT "combat_instances_template_id_enemy_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."enemy_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combat_instances" ADD CONSTRAINT "combat_instances_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enemy_templates" ADD CONSTRAINT "enemy_templates_dm_id_users_id_fk" FOREIGN KEY ("dm_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enemy_templates" ADD CONSTRAINT "enemy_templates_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enemy_templates" ADD CONSTRAINT "enemy_templates_location_resource_id_world_resources_id_fk" FOREIGN KEY ("location_resource_id") REFERENCES "public"."world_resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_current_location_resource_id_world_resources_id_fk" FOREIGN KEY ("current_location_resource_id") REFERENCES "public"."world_resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_members" ADD CONSTRAINT "world_members_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_members" ADD CONSTRAINT "world_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_members" ADD CONSTRAINT "world_members_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_resources" ADD CONSTRAINT "world_resources_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worlds" ADD CONSTRAINT "worlds_dm_id_users_id_fk" FOREIGN KEY ("dm_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_action_log_session" ON "action_log" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_characters_user" ON "characters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_characters_world" ON "characters" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_session" ON "chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_combat_session" ON "combat_instances" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_rolls_session" ON "dice_rolls" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_enemy_templates_dm" ON "enemy_templates" USING btree ("dm_id");--> statement-breakpoint
CREATE INDEX "idx_enemy_templates_npc" ON "enemy_templates" USING btree ("is_npc");--> statement-breakpoint
CREATE INDEX "idx_sessions_world" ON "game_sessions" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "idx_session_participants_session" ON "session_participants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_world_members_world" ON "world_members" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "idx_world_members_user" ON "world_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_world_resources_world" ON "world_resources" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "idx_world_resources_type" ON "world_resources" USING btree ("world_id","type");--> statement-breakpoint
CREATE INDEX "idx_worlds_dm" ON "worlds" USING btree ("dm_id");--> statement-breakpoint
CREATE INDEX "idx_worlds_room_key" ON "worlds" USING btree ("room_key");
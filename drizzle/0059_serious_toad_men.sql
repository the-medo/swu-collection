CREATE TABLE "play"."worker_metric_rollups" (
	"worker_id" text NOT NULL,
	"sampled_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"resource_source" text NOT NULL,
	"memory_used_bytes" bigint NOT NULL,
	"memory_limit_bytes" bigint,
	"process_rss_bytes" bigint NOT NULL,
	"heap_used_bytes" bigint NOT NULL,
	"cpu_percent" double precision NOT NULL,
	"cpu_limit_cores" double precision,
	"event_loop_lag_ms" double precision NOT NULL,
	"running_games" integer NOT NULL,
	"active_games" integer NOT NULL,
	"loaded_games" integer NOT NULL,
	"loading_games" integer NOT NULL,
	"attached_games" integer NOT NULL,
	"busy_games" integer NOT NULL,
	"queued_operations" integer NOT NULL,
	"game_capacity" integer NOT NULL,
	"connections" integer NOT NULL,
	"live_connections" integer NOT NULL,
	"replay_connections" integer NOT NULL,
	"rooms" integer NOT NULL,
	"ended_games" integer NOT NULL,
	"pending_statistics" integer NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"bucket_seconds" integer NOT NULL,
	CONSTRAINT "worker_metric_rollups_worker_id_bucket_seconds_bucket_start_pk" PRIMARY KEY("worker_id","bucket_seconds","bucket_start"),
	CONSTRAINT "worker_metric_rollups_resolution" CHECK ("play"."worker_metric_rollups"."bucket_seconds" IN (600, 3600))
);
--> statement-breakpoint
CREATE INDEX "worker_metric_rollups_sampled_at" ON "play"."worker_metric_rollups" USING btree ("sampled_at");--> statement-breakpoint
CREATE INDEX "worker_metric_rollups_compaction" ON "play"."worker_metric_rollups" USING btree ("bucket_seconds","bucket_start");
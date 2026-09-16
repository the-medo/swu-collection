CREATE TABLE "play"."worker_metrics" (
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
	CONSTRAINT "worker_metrics_worker_id_sampled_at_pk" PRIMARY KEY("worker_id","sampled_at"),
	CONSTRAINT "worker_metrics_source" CHECK ("play"."worker_metrics"."resource_source" IN ('cgroup-v2', 'cgroup-v1', 'process')),
	CONSTRAINT "worker_metrics_resources" CHECK ("play"."worker_metrics"."memory_used_bytes" >= 0 AND ("play"."worker_metrics"."memory_limit_bytes" IS NULL OR "play"."worker_metrics"."memory_limit_bytes" > 0)
        AND "play"."worker_metrics"."process_rss_bytes" >= 0 AND "play"."worker_metrics"."heap_used_bytes" >= 0 AND "play"."worker_metrics"."cpu_percent" >= 0
        AND ("play"."worker_metrics"."cpu_limit_cores" IS NULL OR "play"."worker_metrics"."cpu_limit_cores" > 0) AND "play"."worker_metrics"."event_loop_lag_ms" >= 0),
	CONSTRAINT "worker_metrics_counts" CHECK ("play"."worker_metrics"."running_games" >= 0 AND "play"."worker_metrics"."active_games" >= 0 AND "play"."worker_metrics"."loaded_games" >= 0
        AND "play"."worker_metrics"."loading_games" >= 0 AND "play"."worker_metrics"."attached_games" >= 0 AND "play"."worker_metrics"."busy_games" >= 0
        AND "play"."worker_metrics"."queued_operations" >= 0 AND "play"."worker_metrics"."game_capacity" > 0 AND "play"."worker_metrics"."connections" >= 0
        AND "play"."worker_metrics"."live_connections" >= 0 AND "play"."worker_metrics"."replay_connections" >= 0 AND "play"."worker_metrics"."rooms" >= 0
        AND "play"."worker_metrics"."ended_games" >= 0 AND "play"."worker_metrics"."pending_statistics" >= 0)
);
--> statement-breakpoint
CREATE INDEX "worker_metrics_sampled_at" ON "play"."worker_metrics" USING btree ("sampled_at");
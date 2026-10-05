-- Run as the database owner after migrations, in the SWUBASE database.
-- Create the swubase_mcp login and set its password separately (see docs/mcp.md).
GRANT CONNECT ON DATABASE :"DBNAME" TO swubase_mcp;
GRANT USAGE ON SCHEMA public TO swubase_mcp;
GRANT SELECT (id, banned, ban_expires) ON "user" TO swubase_mcp;
GRANT SELECT (id, user_id, expires_at) ON session TO swubase_mcp;
GRANT SELECT (user_id, client_id, scopes, resources, created_at) ON oauth_consent TO swubase_mcp;
GRANT SELECT (client_id, disabled) ON oauth_client TO swubase_mcp;
GRANT SELECT (client_id, resource_id) ON oauth_client_resource TO swubase_mcp;
GRANT SELECT (identifier, disabled) ON oauth_resource TO swubase_mcp;
GRANT SELECT (id, user_id, started_at), INSERT (user_id, client_id, tool),
  UPDATE (outcome, result_count, duration_ms) ON mcp_tool_usage TO swubase_mcp;

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
GRANT SELECT (id, user_id, name, description, format, public, leader_card_id_1,
  leader_card_id_2, base_card_id, card_pool_id, created_at, updated_at) ON deck TO swubase_mcp;
GRANT SELECT (deck_id, card_id, board, quantity) ON deck_card TO swubase_mcp;
GRANT SELECT (deck_id, card_pool_number, location) ON card_pool_deck_cards TO swubase_mcp;
GRANT SELECT (card_pool_id, card_pool_number, card_id) ON card_pool_cards TO swubase_mcp;
-- Apply the main app's existing link/team folder-sharing access rule.
GRANT SELECT (id, parent_id, user_id) ON deck_folder TO swubase_mcp;
GRANT SELECT (deck_id, folder_id) ON deck_folder_deck TO swubase_mcp;
GRANT SELECT (folder_id, user_id, audience, team_id) ON deck_folder_share TO swubase_mcp;
GRANT SELECT (team_id, user_id) ON team_member TO swubase_mcp;
-- Drizzle includes DEFAULT for the other usage columns in its INSERT statement.
GRANT SELECT (id, user_id, started_at),
  INSERT (id, user_id, client_id, tool, started_at, outcome, result_count, duration_ms),
  UPDATE (outcome, result_count, duration_ms) ON mcp_tool_usage TO swubase_mcp;

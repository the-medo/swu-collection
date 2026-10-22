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

-- Article ownership, drafts, revisions and public indexes. Authentication and
-- entitlement rows remain read-only; narrowly scoped functions supply row locks.
GRANT SELECT (display_name, image) ON "user" TO swubase_mcp;
GRANT EXECUTE ON FUNCTION public.mcp_lock_user(text), public.mcp_prepare_image_quota(text) TO swubase_mcp;
GRANT SELECT, INSERT ON creation TO swubase_mcp;
GRANT UPDATE (draft, revision, updated_at, manually_edited_fields, published,
  published_revision, published_at, public_updated_at, published_manually_edited_fields,
  creator_id, owner_user_id, ownership_revision) ON creation TO swubase_mcp;
GRANT SELECT, INSERT, DELETE ON creation_revision, creation_tag, creation_reference TO swubase_mcp;
GRANT SELECT ON creator_profile, creator_member TO swubase_mcp;
GRANT UPDATE (updated_at) ON creator_profile TO swubase_mcp;
GRANT SELECT, INSERT ON creator_publishing_request, mcp_mutation TO swubase_mcp;
GRANT SELECT ON preview_card, meta, tournament, tournament_type, tournament_deck,
  tournament_match, tournament_group, tournament_group_tournament, format TO swubase_mcp;
GRANT SELECT (id, user_id, name, visibility, type, status, archived_at, updated_at)
  ON card_pools TO swubase_mcp;
GRANT SELECT (id, user_id, title, visibility, created_at) ON user_album TO swubase_mcp;
GRANT SELECT ON user_file_storage, user_file TO swubase_mcp;
GRANT INSERT ON user_file TO swubase_mcp;
GRANT SELECT ON melee_connection, user_melee_tournaments, user_melee_tournament_sync TO swubase_mcp;
GRANT INSERT, UPDATE, DELETE ON user_melee_tournaments, user_melee_tournament_sync TO swubase_mcp;

-- Collection ownership: read-only, without private notes, prices or secondary amounts.
GRANT SELECT (id, user_id, title, collection_type, public, for_sale, for_decks, updated_at) ON collection TO swubase_mcp;
GRANT SELECT (collection_id, card_id, variant_id, foil, condition, language, amount) ON collection_card TO swubase_mcp;

-- Normal deck authoring. Ownership/limited-deck policy is enforced by the tools.
GRANT INSERT ON deck, deck_card, deck_information TO swubase_mcp;
GRANT UPDATE (name, description, format, public, leader_card_id_1, leader_card_id_2, base_card_id, updated_at) ON deck TO swubase_mcp;
GRANT UPDATE (quantity), DELETE ON deck_card TO swubase_mcp;
GRANT SELECT (deck_id), UPDATE (aspect_command, aspect_vigilance, aspect_aggression, aspect_cunning, aspect_heroism, aspect_villainy, base_aspect, base_special_name) ON deck_information TO swubase_mcp;
-- The existing AFTER INSERT deck trigger creates its empty discussion/binding.
GRANT INSERT (type), SELECT (id) ON discussion TO swubase_mcp;
GRANT INSERT (deck_id, discussion_id) ON deck_discussion TO swubase_mcp;

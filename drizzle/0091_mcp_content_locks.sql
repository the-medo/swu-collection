-- Lock-only capability for the restricted MCP role. PUBLIC cannot call these
-- functions. The separately applied MCP grants opt the runtime role in.
CREATE FUNCTION public.mcp_lock_user(p_user_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM id FROM public."user" WHERE id = p_user_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User unavailable' USING ERRCODE = 'P0002'; END IF;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.mcp_lock_user(text) FROM PUBLIC;
--> statement-breakpoint
-- Provision only the table's default allowance. No caller-selected quota and
-- no permission to alter existing entitlements.
CREATE FUNCTION public.mcp_prepare_image_quota(p_user_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.user_file_storage (user_id) VALUES (p_user_id) ON CONFLICT DO NOTHING;
  PERFORM user_id FROM public.user_file_storage WHERE user_id = p_user_id FOR UPDATE;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.mcp_prepare_image_quota(text) FROM PUBLIC;

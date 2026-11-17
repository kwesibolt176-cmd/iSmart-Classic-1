CREATE OR REPLACE FUNCTION public.purge_business_data(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t record;
  pass int;
  biz_ids uuid[];
  total bigint := 0;
  affected bigint;
  skipped text[] := ARRAY['audit_logs', 'tax_audit_logs', 'user_activity_logs', 'ismart_callbacks'];
BEGIN
  SELECT array_agg(id) INTO biz_ids FROM public.business_profiles WHERE user_id = _user_id;

  -- Multiple passes so foreign-key ordering resolves itself
  FOR pass IN 1..6 LOOP
    -- Child rows keyed by the business id
    IF biz_ids IS NOT NULL THEN
      FOR t IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables tb
          ON tb.table_schema = c.table_schema
         AND tb.table_name = c.table_name
         AND tb.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND c.column_name = 'business_id'
          AND c.table_name <> ALL (skipped)
      LOOP
        BEGIN
          EXECUTE format('DELETE FROM public.%I WHERE business_id = ANY($1)', t.table_name) USING biz_ids;
          GET DIAGNOSTICS affected = ROW_COUNT;
          total := total + affected;
        EXCEPTION WHEN others THEN NULL;
        END;
      END LOOP;
    END IF;

    -- Rows owned directly by the user
    FOR t IN
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema
       AND tb.table_name = c.table_name
       AND tb.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public'
        AND c.column_name IN ('user_id', 'auth_user_id', 'admin_user_id', 'target_user_id')
        AND c.table_name <> ALL (skipped)
      ORDER BY c.table_name
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE %I = $1', t.table_name, t.column_name) USING _user_id;
        GET DIAGNOSTICS affected = ROW_COUNT;
        total := total + affected;
      EXCEPTION WHEN others THEN NULL;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'business_ids', COALESCE(to_jsonb(biz_ids), '[]'::jsonb),
    'rows_deleted', total,
    'remaining_profiles', (SELECT count(*) FROM public.business_profiles WHERE user_id = _user_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_business_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_business_data(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.purge_business_data(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_business_data(uuid) TO service_role;
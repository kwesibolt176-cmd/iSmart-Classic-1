-- Bootstrap the requested super administrator using an exact, normalized email match.
-- Fail closed if the account is absent or ambiguous so the role is never granted
-- to an unintended user.
DO $$
DECLARE
  target_user_id UUID;
  matching_user_count INTEGER;
  inserted_role_count INTEGER;
BEGIN
  SELECT count(*)
  INTO matching_user_count
  FROM auth.users
  WHERE lower(email) = lower('edemking@gmail.com');

  IF matching_user_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one auth user for edemking@gmail.com, found %',
      matching_user_count;
  END IF;

  SELECT id
  INTO STRICT target_user_id
  FROM auth.users
  WHERE lower(email) = lower('edemking@gmail.com');

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (target_user_id, 'super_admin'::public.app_role, NULL)
  ON CONFLICT (user_id, role) DO NOTHING;

  GET DIAGNOSTICS inserted_role_count = ROW_COUNT;

  IF inserted_role_count = 1 THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      new_data,
      metadata
    )
    VALUES (
      target_user_id,
      'role_granted',
      'user_role',
      target_user_id,
      jsonb_build_object('role', 'super_admin'),
      jsonb_build_object(
        'source', 'database_migration',
        'migration', '20261012190000_grant_edemking_super_admin'
      )
    );
  END IF;
END
$$;

-- Throwaway no-op migration used only to verify the deploy-migrations.yml
-- CI pipeline actually builds, pushes, and the one-shot runner applies it
-- and records it in supabase_migrations.schema_migrations. Changes nothing.
select 1;

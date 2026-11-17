delete from public.subcategories where user_id='bb3d5942-d29f-4022-9afa-e8e9f1635bf7';
delete from public.categories where user_id='bb3d5942-d29f-4022-9afa-e8e9f1635bf7';
delete from public.business_wallets where business_id in (select id from public.business_profiles where user_id='bb3d5942-d29f-4022-9afa-e8e9f1635bf7');
delete from public.locations where user_id='bb3d5942-d29f-4022-9afa-e8e9f1635bf7';
delete from public.feature_settings where user_id='bb3d5942-d29f-4022-9afa-e8e9f1635bf7';
delete from public.business_profiles where user_id='bb3d5942-d29f-4022-9afa-e8e9f1635bf7';
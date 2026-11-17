create policy "Super admins can view all KYC documents"
on storage.objects for select to authenticated
using (bucket_id = 'kyc-documents' and public.has_role(auth.uid(), 'super_admin'));
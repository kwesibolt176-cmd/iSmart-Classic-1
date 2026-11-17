# Repair core merchant workflows

## Confirmed defects

- Password reset email input is wired to the normal sign-in `email` state while the request reads `resetEmail`, so the request always reports that email is missing.
- Classic signup calls the individual registration action even when a business name is provided; the business registration action already exists but is unused by this screen.
- VerificationBadge shows simulated email/SMS success using timers; its Verify buttons have no handlers. The separate KYC page has the real OTP flow.
- No active tax configuration exists in the database, while the tax loader requires exactly one active row; this explains the tax computation failure/no configuration behavior.
- Branch assignments allow only admins to create/change rows. Merchant owners can only view, causing the reported row-level access rejection.
- Product deletion is allowed by backend policy but no delete command exists in the Products interface.
- The bulk importer handles many barcode collisions, but its pre-check silently ignores query failures and a race can still hit the global barcode constraint.
- Project monitoring confirms repeated upstream iSmart 401 failures; the utilities function turns those into generic 500 errors. Some password reset client paths also contain an extra `/api` segment after a base URL that already ends in `/api`.
- Notification fetching combines backend and iSmart messages, but failed backend queries are swallowed and the realtime subscription is never cleaned up. Local notification deletion has no matching delete policy.
- Verification document upload reaches `business_verifications.documents`, but the admin review path and document visibility need an end-to-end check.

## Implementation

1. **Auth and business onboarding**
   - Correct password-reset state binding and validate/normalize the same value sent to the function.
   - Use business registration when a business name is supplied, and keep the local auth/profile sync aligned with that business identity.
   - Correct the password-reset endpoint paths and validate request payloads.

2. **Verification and notifications**
   - Replace simulated VerificationBadge email/phone actions with the existing real OTP send/verify functions.
   - Validate that uploaded document metadata is visible in the super-admin verification queue; repair the query or access rule only where required.
   - Stop swallowing notification query/action failures, clean up realtime subscriptions, and add the missing owner delete access rule.
   - Test email OTP, phone OTP, upload, admin visibility, and notification read/delete separately.

3. **Products, tax, and branches**
   - Make barcode conflict handling deterministic and report any pre-check failure instead of attempting an unsafe batch.
   - Add a confirmed inventory delete action using the existing design system, with dependency errors surfaced clearly.
   - Seed one valid active Ghana tax configuration and make configuration reads tolerant of zero/multiple rows.
   - Add merchant-owner create/update/delete access for branch assignments, constrained through owned locations and products.

4. **Collections, disbursement, utilities, iVerify, and wallet**
   - Trace every frontend action to its deployed function and exact upstream endpoint; correct confirmed path/method/header mismatches.
   - Handle expired iSmart sessions consistently instead of returning generic 500/404 messages, while preserving real upstream errors.
   - Test Telecel and other providers with the signed-in iSmart session. Do not claim authenticated paths fixed without signed-in end-to-end evidence.
   - Verify callbacks update collection/disbursement/utility statuses and ensure wallet history includes all supported transaction sources rather than only e-collections.
   - Validate iVerify mobile and bank requests and operator mapping against the real function.

## Verification

- Run focused frontend tests/build checks and edge-function tests.
- Exercise reset password, business signup, verification OTP/upload/admin review, bulk import/delete, tax calculation, branch assignment, notifications, collections, disbursement, utilities, wallet history, and iVerify in the live preview.
- Report each external integration as **verified**, **upstream/configuration blocked**, or **authenticated path: UNVERIFIED**.

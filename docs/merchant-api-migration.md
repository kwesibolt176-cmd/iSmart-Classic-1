# Merchant API migration

## Scope

The portal uses the production Merchant API at `https://merchant.ismartghana.com/api` for merchant identity, business compliance, wallet operations, hosted checkout, utilities, invoices, settlements, reporting, and risk operations. Contract tests remain explicitly pointed at `https://stgmerchant-api.ismartghana.com` unless `ISMART_MERCHANT_API_URL` is supplied to the test command.

The browser never receives Merchant API access or refresh tokens. Tokens are AES-GCM encrypted in `merchant_api_sessions`, which has RLS enabled and no grants for `anon` or `authenticated`. The encryption key is derived server-side from `SUPABASE_SERVICE_ROLE_KEY`; existing plaintext rows are encrypted when first used. Rotating that service-role credential invalidates old ciphertext safely and requires affected merchants to sign in again. Portal requests are authenticated with the user's Supabase session, and the `merchant-api` edge function verifies that the requested Merchant business ID matches the business ID in the server-side session.

The Supabase session is the portal session, while iSmart remains the identity source of truth. On an online startup, linked merchant accounts validate their server-side iSmart session with `GET /v1/auth/me`. Definitively expired, missing, or mismatched sessions are removed and require a fresh sign-in; transient upstream failures do not sign the merchant out. Portal logout calls `POST /v1/auth/logout`, removes the server-side Merchant session, clears account-scoped browser caches, and then signs out of Supabase.

## Deployment order

1. Apply `20261007090000_merchant_api_sessions.sql`.
2. Set `ISMART_MERCHANT_API_URL=https://merchant.ismartghana.com/api` in the Edge Functions container. The runtime also defaults to this production API base when the variable is omitted. Use the staging host explicitly in non-production environments. URL construction preserves path prefixes such as `/api`; do not configure the browser-facing host without its API prefix.
3. Deploy `merchant-auth` and `merchant-api`.
4. Deploy the Edge Functions image. Its runtime uses an operator-supplied
   `MERCHANT_RECONCILIATION_SECRET` when present; otherwise both the dispatcher
   and worker derive a domain-separated credential from the server-only
   `SUPABASE_SERVICE_ROLE_KEY`. It invokes `reconcile-merchant-transactions`
   every five minutes without persisting or exposing that credential.
5. No host cron entry is required. Confirm the Edge Runtime logs a successful
   reconciliation after its initial 30-second delay and every five minutes
   thereafter. Processor webhooks terminate at merchant-core by contract; the
   portal must never receive or copy the processor webhook secret.
6. Deploy the migrated financial functions: `ismart-checkout`, `wallet-topup`, `process-disbursement`, `ismart-status-check`, `ismart-uploads`, and `ismart-callback`.
7. Deploy the web application.
8. Complete the staging UAT matrix below before directing production traffic to the new API.

Do not set a Merchant API credential in frontend environment variables. The API uses the merchant's server-side bearer session.

## Security and transaction rules

- Money-changing requests require a stable `Idempotency-Key`.
- Amounts sent to the Merchant API use decimal strings in GHS.
- Payouts, transfers, and utility purchases require the merchant transaction PIN.
- Collection and disbursement provider choices display the live `wallet/payment-methods` health as an advisory warning. Merchants may still attempt a request because processor health can recover between the status read and submission.
- Local wallet balances are not pre-mutated. Processor status is the financial source of truth.
- The old unauthenticated callback is retired and returns HTTP 410 without changing records.
- Notifications remain in the tenant-isolated local `notifications` table because the new Merchant API does not expose a notification resource.
- Bank beneficiary lookup is not offered by the new contract. Only wallet-party lookup and verification of the merchant's own bank accounts are supported.
- Bank collection and payout controls may remain visible, but the server checks the
  live payment-method catalog before submission. Unsupported bank rails are
  rejected locally with a clear error instead of being sent to the processor.
- Authenticated checkout creation derives the merchant from the caller's verified
  portal session. Anonymous storefront checkout derives the merchant, amount, and
  reference from an existing payable order or inactive gift card; client-supplied
  merchant identity and financial values are not authoritative.

## Legacy compatibility

Legacy edge functions and shared clients remain in the repository for rollback history, but the web application no longer invokes them. Do not deploy them into a new environment. Remove them only after staging and production traffic logs confirm that no external client still calls them.

## Required staging UAT

| Area | Verification |
| --- | --- |
| Authentication | Register, login, 2FA challenge, logout, password reset, token refresh |
| Alternative authentication | Google redirect/exchange and passwordless phone request/verify |
| Tenant isolation | A session for business A cannot request a route for business B |
| Compliance | Document claim, signed upload, confirmation, verification-level refresh |
| Wallet | Collection, payout, transfer, utility purchase, status polling, retry with the same idempotency key |
| Checkout | Create, public load, pay, cancel, and status |
| Invoices | Create, update, issue, send, replace payment link, void, delete |
| Settlements | Configure, run now, list runs, retry a failed run, delete configuration |
| Reporting | Month summary and transaction export |
| Risk | Profile update, computed rating, override lifecycle, reports |
| Binary resources | Authenticated invoice PDF, business logo, public checkout PDF and logo |
| Reconciliation | Pending collection and payout resolution, redelivery/idempotency behavior |

The compliance upload payload and identity-core password-reset payload are forwarded contracts in the published OpenAPI document. Confirm their exact staging behavior during UAT before production rollout.

Run the non-mutating staging checks with `npm run test:merchant-staging`. A real compliance upload cannot be safely automated without a dedicated staging merchant, document fixture, and explicit permission to create compliance records; record that evidence in the release checklist before production promotion.

Set `ISMART_STAGING_ACCESS_TOKEN` and `ISMART_STAGING_BUSINESS_ID` to enable the
authenticated, read-only staging checks for principal identity, business access,
payment-method discovery, and cross-business denial. Do not commit either value.

## Gemini product images

Product image generation, polishing, and visual analysis use the official Gemini
`generateContent` API. Configure `GEMINI_API_KEY` only in the Edge Functions
container. Never add it to a `VITE_*` variable or the web image. Optional
server-side overrides are `GEMINI_IMAGE_MODEL` (default
`gemini-3.1-flash-image`), `GEMINI_TEXT_MODEL` (default `gemini-3.5-flash`),
and comma-separated `AI_IMAGE_ALLOWED_HOSTS` for additional trusted image hosts.
If server access is unavailable, a super admin may
configure `GEMINI_API_KEY` from Control Panel → AI Secrets. That value is AES-GCM
encrypted and accessible only through service-role Edge Functions. The server
environment variable always takes precedence. Because the encryption key is
derived from `SUPABASE_SERVICE_ROLE_KEY`, save the Gemini key again immediately
after rotating the service-role credential. Secret values are never returned or
written to audit logs.

All three functions require a valid Supabase user session. Generated images are
stored in the authenticated user's `product-images/<user-id>/ai/` folder; the
Gemini API key and raw provider errors are never returned to the browser. Image
editing and analysis accept uploaded product images, data URLs below 5MB, or
explicitly allow-listed HTTPS hosts.

# QA/UAT Remediation Matrix

Audit date: 2026-09-28

| Test ID | Requirement | Existing implementation | Root cause / gap | Files affected | DB change? | Backend change? | Frontend change? | Risk | Proposed fix |
|---|---|---|---|---|---:|---:|---:|---|---|
| P1 | Profile photo upload and persistence | `ProfileSettings` uploads to `avatars` and stores `avatar_url` in auth metadata; image type and 2 MB limit are checked | Validation accepts any `image/*`, while UAT explicitly permits JPG/PNG only | `src/components/ProfileSettings.tsx` | No | No | Yes | Low | Restrict MIME/extensions to JPEG/PNG and keep the existing storage/auth flow |
| B1 | Daily summary, hours, printer width persist | `BusinessSettings` reads/writes `business_profiles`; summary worker reads the toggle | Settings persist; downstream receipt width/open hours usage needs verification | `BusinessSettings`, receipt components, daily summary function | No | No | Yes | Low | Reuse persisted profile settings in receipt output and validate hours |
| POS1 | POS settings persist and affect checkout | `POSSettings` is local state with a simulated save | No table, persistence, tenant scope, or downstream consumption | `POSSettings`, `Payment`, receipt flow | Yes | Yes | Yes | High | Add tenant-scoped `pos_settings` with constraints/RLS and consume defaults during checkout/completion |
| POS2 | Reject invalid tax/service charge values | Number inputs only; save is simulated | No client validation or database constraints | `POSSettings`, migration | Yes | Yes | Yes | Medium | Validate finite 0–100 values in UI and enforce CHECK constraints in DB |
| C1 | Reject duplicate categories per tenant | UI inserts directly; no uniqueness constraint | Race-prone and duplicates allowed, including case variants | `CategoryManagement`, migration | Yes | Yes | Yes | High | Add normalized unique index after duplicate-safe preflight; surface conflict errors |
| C2 | Hide inactive categories publicly, retain product links | Public storefront fetches all categories; product FK remains | Missing active filter/public policy; deletion remains available | `PublicStorefront`, `CategoryManagement`, migration | Yes | Yes | Yes | Medium | Filter active categories/products for public reads and favor deactivation over destructive deletion |
| T1 | Annual turnover and VAT threshold | Turnover persists; `useTaxEngine` reads versioned tax config | Threshold message contains hard-coded GHS 200,000 and threshold is not stored in config | `TaxSettingsCard`, `use-tax-engine`, tax migration | Yes | Yes | Yes | Medium | Add configurable VAT threshold and render the configured value |
| S1 | Supplier search/status | Search and activation persistence exist | New PO dialog may include inactive suppliers; DB does not enforce active supplier ownership | `Suppliers`, `NewSupplierOrderDialog`, migration | Yes | Yes | Yes | High | Filter active suppliers and add insert/update trigger; preserve historical FK rows |
| A1 | Announcements validation and expiry | CRUD exists; required HTML attributes exist | Queries return expired records; server does not define active semantics | `StaffAnnouncementsManager`, staff display queries, migration | Yes | Yes | Yes | Medium | Validate trimmed title/content and expose tenant-scoped active view/RPC with expiry filtering |
| EOD1 | Save checklist progress | Full upsert-like create/update with business/location/date scope exists | No unique DB key prevents duplicate daily records | `EndOfDayChecklist`, migration | Yes | Yes | Minor | Medium | Add unique indexes for location/no-location daily checklist scope |
| L1 | Loyalty benefits one per line | Already splits, trims, and filters into JSON array | Needs regression tests | `NewTierDialog`, helper/tests | No | No | Minor | Low | Extract/test normalization helper |
| G1 | Gift-card expiry/status/history | Expiry persists and UI checks expiry; history table exists | Issuance does not write ledger; status can become stale | gift-card components, migration/RPC | Yes | Yes | Yes | High | Create transactional issuance RPC with ledger entry and derived effective status |
| G2 | Transaction-safe redemption | Payment performs read/update/insert from browser | Race condition, negative balance risk, wrong tenant ID under staff sessions, non-idempotent | `Payment`, migration/RPC | Yes | Yes | Yes | Critical | Atomic locked redemption RPC with tenant/order/idempotency checks and ledger insert |
| PR1 | Storefront promo visibility only | Banner filters `show_on_storefront`; manager separates `is_active` | Anonymous code validation cannot read hidden promos under current public RLS | promo validation path, migration/RPC | Yes | Yes | Possibly | High | Add code-validation RPC that ignores display flag but enforces active/date/usage rules |
| EC1 | Rich email formatting persists | HTML editor supports bold/italic/list/alignment/link and content persists | Preview/history use unsanitized `dangerouslySetInnerHTML` | editor/preview/history, sanitizer | No | No | Yes | High | Add allowlist sanitizer and use it for every rendered campaign HTML surface |
| EC2 | Saved/suggested templates populate editor | Implemented and editable | Saved-template query is not explicitly tenant-scoped | `EmailCampaignManager`, `SMSCampaignManager` | No | No | Yes | Medium | Scope queries by effective tenant and keep post-selection editing |
| SMS1 | Live 160-character counter | Implemented with `maxLength`, slicing, and live count | None in stated single-part requirement | `SMSCampaignManager` | No | No | No | Low | Add regression coverage only |
| AB1 | Real dashboard statistics | Test/status counts are real; recipient tile needs aggregate data | Recipient total is not globally aggregated; dispatch path only assigns rows | `CampaignABTesting`, backend dispatcher | Maybe | Yes | Yes | High | Aggregate real recipient rows and dispatch through provider-backed execution |
| AB2 | Winner from actual performance | Per-variant status metrics are calculated | UI asks user to choose A/B manually; no deterministic reusable rule | A/B component, winner service/RPC | Yes | Yes | Yes | High | Add minimum-sample/tie-aware winner function using selected metric |
| AU1 | Resolve automation variables at execution | UI stores placeholders/rules | No scheduler/worker resolves recipient variables; `points_balance` absent | automation component, new/shared resolver, worker | Maybe | Yes | Yes | High | Preserve templates and resolve supported variables only at execution time |
| CH1 | Actual campaign history | Reads real email/SMS campaign tables | Queries rely on RLS but omit explicit tenant filters; HTML unsafe | `CampaignHistory` | No | No | Yes | Medium | Add explicit tenant filters and sanitized rendering |
| CT1 | Reusable templates selectable later | Tables/UI already exist and managers select active templates | Create/edit manager and consistent tenant filters require verification | template components/managers | No | No | Yes | Medium | Reuse existing table/UI, enforce tenant filter and placeholder validation |

## Architecture summary

- Frontend: Vite, React 18, TypeScript, React Router, TanStack Query, Tailwind/shadcn.
- Backend: Supabase Postgres, Row Level Security, RPC functions, Storage, Auth, and Deno Edge Functions.
- Authentication: Supabase Auth for owners plus a staff session layer; owner `user_id` is the primary tenant key.
- State: React context for business/location/cart/staff session, TanStack Query for server state, local state for forms, IndexedDB/local storage for offline support.
- Payments/POS: browser checkout coordinates orders and transactions; external financial calls use Supabase Edge Functions. Several local POS operations still bypass atomic server-side RPCs.
- Jobs/notifications: scheduled functions for reminders and daily summaries; email/SMS functions plus a pending-action approval queue.
- Tests: no automated test runner or test files were present at audit time.

## Baseline verification

- `npm run build`: passes, with one duplicate-case warning in `OrderTracking.tsx`.
- `npm run lint`: fails with 563 errors and 168 warnings across the pre-existing codebase.
- `npm audit`: 25 advisories (17 high, 6 moderate, 2 low); no critical advisories.

## Remediation status

- Implemented: P1, B1 validation, POS1/POS2, C1/C2, T1, S1 server enforcement, A1 validation/active RPC, EOD1, L1, G1/G2, PR1 validation RPC, EC1/EC2, SMS1 existing behavior, AB1 recipient aggregation, AB2 deterministic winner selection, AU1 shared runtime variable resolver, CH1, and CT1.
- Added automated regression coverage for loyalty benefit normalization, campaign variable resolution, and A/B winner selection.
- Remaining infrastructure work: provider-backed A/B dispatch and a scheduled automation worker are not present in the repository and cannot be made operational through UI-only changes. Their persisted definitions and runtime-safe variable resolver are ready for a future authenticated worker.
- Verification after remediation: production build passes; TypeScript passes; 5 targeted tests pass. Repository-wide lint still has substantial pre-existing debt. Production dependency audit reports 22 advisories (15 high, 5 moderate, 2 low); `npm audit fix` is currently blocked by an upstream React dependency-resolution conflict, so no forced major upgrade was applied.

# QA Critical Findings — Root Causes & Fixes

Consolidated findings from two QA test batches (26 unique test case IDs). Each is investigated via code read and/or live reproduction against the local dev environment. Status legend:

- ✅ **Fixed** — code change already made and verified
- ✅ **Fixed (local mock only)** — a local-dev-only fix was applied so this can be tested locally; does not change production behavior
- 🟡 **Confirmed, not yet fixed** — root cause found and verified, fix proposed below, not yet applied
- 🟠 **Confirmed, low confidence** — plausible root cause, needs a live retest to confirm before fixing
- ⚪ **Not a code bug** — environment/credentials limitation, not something to fix in code

## Summary table

| Test ID | Area | Status | Group |
|---|---|---|---|
| CDASH-03 | Dashboard — View Inventory link | ✅ Fixed (PR #38) | [A](#a-dashboard-low-stock-warning) |
| CDASH-04 | Dashboard — banner hidden when resolved | ✅ Fixed (PR #38) | [A](#a-dashboard-low-stock-warning) |
| CADD-03 | Add Money — Mobile Money phone field | ✅ Fixed (local mock) / 🟡 latent prod bug | [B](#b-verification-session-has-expired-add-moneysend-moneycheckout) |
| CADD-04 | Add Money — Fetch Account Details (mobile) | ✅ Fixed (local mock) / 🟡 latent prod bug | [B](#b-verification-session-has-expired-add-moneysend-moneycheckout) |
| CADD-07 | Add Money — Fetch Account Details (bank) | ✅ Fixed (local mock) / 🟡 latent prod bug | [B](#b-verification-session-has-expired-add-moneysend-moneycheckout) |
| CADD-09 | Add Money — Bank Transfer top-up submission | ⚪ Needs live iSmart keys | [B](#b-verification-session-has-expired-add-moneysend-moneycheckout) |
| CSEND-08 | Send Money — successful transfer | ✅ Fixed & verified | [C](#c-generic-edge-function-error-instead-of-real-reason) |
| CSEND-09 | Send Money — insufficient balance | ✅ Fixed & verified | [C](#c-generic-edge-function-error-instead-of-real-reason) |
| CLINK-06 | Payment Links — link 404s | 🟡 Confirmed, not fixed | [D](#d-payment-links-shareable-link-404s) |
| CAIR-04 | Airtime — Verify Number is a no-op | 🟡 Confirmed, not fixed | [E](#e-airtime--data-bundle-issues) |
| CAIR-05 | Airtime — amount "0" bypasses validation | ✅ Fixed & verified | [E](#e-airtime--data-bundle-issues) |
| CAIR-07 | Data Bundle — Fetch Bundles shows nothing | ✅ Fixed (best-effort, needs live retest) | [E](#e-airtime--data-bundle-issues) |
| CAIR-08 | Data Bundle — same root cause as CAIR-07 | ✅ Fixed (best-effort, needs live retest) | [E](#e-airtime--data-bundle-issues) |
| CPROD-10 | Edit Product — image upload clears data | ✅ Fixed & verified | [F](#f-edit-product-image-upload-clearing-data) |
| COCHK-11 | Orders Checkout — Card payment method | 🟡 Confirmed, not fixed | [G](#g-orders-checkout-payment-issues) |
| COCHK-12 | Orders Checkout — MoMo doesn't initiate | ✅ Fixed (local mock) | [B](#b-verification-session-has-expired-add-moneysend-moneycheckout) |
| COCHK-17 | Orders Checkout — Send Payment Link | 🟡 Confirmed, not fixed | [G](#g-orders-checkout-payment-issues) |
| COCHK-21 | Orders Checkout — Complete Payment fails | ✅ Fixed (local mock) | [B](#b-verification-session-has-expired-add-moneysend-moneycheckout) |
| CBRN-05 | Branches — assign quantity exceeds stock | 🟡 Confirmed, not fixed | [H](#h-branch-stock-assignment-not-validated) |
| CFWAL-07 | Business Wallet — withdrawal fails | ✅ Fixed & verified | [I](#i-wallet-withdrawal--disbursement-silent-db-failures) |
| CFDIS-05 | Disbursements — Quick Transfer to beneficiary | ✅ Fixed & verified | [C](#c-generic-edge-function-error-instead-of-real-reason) |
| CFDIS-06 | Disbursements — Verify Wallet | 🟠 Low confidence, needs retest | [C](#c-generic-edge-function-error-instead-of-real-reason) |
| CFDIS-07 | Disbursements — Send to Mobile Money/Bank | ✅ Fixed & verified | [C](#c-generic-edge-function-error-instead-of-real-reason) |
| CFUTL-07 | Utilities — Airtime stuck pending → failed | 🟡 Confirmed, not fixed | [J](#j-utility-payment-reference-mismatch) |
| CTSTF-05 | Staff — Branch Assignment untestable | 🟡 Confirmed, not fixed | [K](#k-add-team-member-silently-does-nothing) |
| CTSTF-08 | Staff — Add Team Member fails silently | 🟡 Confirmed, not fixed | [K](#k-add-team-member-silently-does-nothing) |

---

## A. Dashboard Low Stock Warning

**Test IDs:** CDASH-03, CDASH-04 — **Status: ✅ Fixed, merged (PR #38)**

### CDASH-03 — "View Inventory" always opened the Catalog tab, not Inventory
**Root cause:** the banner's callback navigated to the generic `"products"` section, and `Products.tsx`'s tabs always defaulted to `"catalog"` with no way to request the inventory tab specifically.
**Fix applied:** added an `initialTab` prop to `Products`, a new `"products-inventory"` section in `Index.tsx`, and pointed the banner's callback at it (`src/pages/Products.tsx`, `src/pages/Index.tsx`, `src/components/Dashboard.tsx`).

### CDASH-04 — Banner kept showing resolved/stale alerts
**Root cause:** `checkLowStock()` in `use-low-stock-alerts.tsx` only ever created new `low_stock_alerts` rows — nothing ever marked a row resolved once its item was restocked above threshold.
**Fix applied:** `checkLowStock()` now also resolves any alert whose item is no longer below threshold, on every check (`src/hooks/use-low-stock-alerts.tsx`).

---

## B. "Verification session has expired" (Add Money/Send Money/Checkout)

**Test IDs:** CADD-03, CADD-04, CADD-07, CADD-09, COCHK-12, COCHK-21

**Root cause (two layers):**
1. **Local dev only:** several `ismart-*` edge functions (`ismart-account`, `ismart-business`, `ismart-security`, `ismart-communications`, `ismart-finance`, `ismart-utilities`, `iverify`, `ismart-checkout`) were not aware of this project's local mock mode. They called the real `gateway.ismartpay.org`/`dev.collection.ismartghana.com` with a fake local token, got rejected, and — critically — `ismart-account` being called automatically by the header's verification badge on every page load meant it **wiped the local session tokens moments after every login**, so logging out and back in never actually fixed anything.
2. **Real/production-relevant, still open:** `src/lib/verify-account.ts`'s `verifyAccount()` treats *any* failure from the first `iverify` call as "token expired" and immediately shows "Your verification session has expired. Please sign in again." — without inspecting what the actual error was. A genuinely invalid account number, a real network hiccup, or an upstream validation error would all produce this same misleading message in production, independent of local mock mode.

**Fix applied (local-dev only, does not touch production behavior):** extended the existing `MOCK_MODE` sentinel pattern (`supabase/functions/_shared/ismart-mock-client.ts`) to all the functions above, plus a bespoke mock branch in `ismart-checkout` (which authenticates by bearer token only, not the platform API key). This is what unblocks CADD-03/04/07 and COCHK-12/21 for local testing.

**Not yet fixed (real bug, affects production too):** `verify-account.ts` should surface the *actual* error from `iverify` (invalid account, network failure, etc.) instead of collapsing everything into a token-expiry message. Proposed fix: only show the "session expired" message when there's truly no token to work with; otherwise pass through the real error text from the `iverify` response.

**CADD-09 note:** QA's own note says "Blocked until live keys are available" — this test fundamentally needs a real iSmart API key/credentials to complete; no amount of local mocking substitutes for that, and it isn't a code bug per se.

---

## C. Generic "Edge function error" instead of real reason

**Test IDs:** CSEND-08, CSEND-09, CFDIS-05, CFDIS-07 — **Status: ✅ Fixed & verified.** CFDIS-06 (low confidence) still needs a retest.

**Root cause — confirmed by reproduction.** Sent an amount exceeding wallet balance via Send Money; got `Edge Function returned a non-2xx status code` instead of "Insufficient balance". `process-disbursement/index.ts` returned HTTP 400/401/500 for every validation failure (insufficient balance, missing fields, business access denied, wallet not found). `DisbursementDialog.tsx` (shared by Send Money *and* Disbursements' Quick Transfer/Send Money) never unwrapped the real JSON error body from Supabase's `FunctionsHttpError` — so Supabase's generic client-side message always won, regardless of the actual reason. This explains CSEND-08's original "Successful Transfer" failure too: whatever the real cause was, it would have surfaced through this same generic message.

**Fix applied:** `process-disbursement/index.ts` now always returns HTTP 200 with `{success:false, error:"..."}` in the body for every validation/failure path (auth, missing fields, business access denied, insufficient balance, missing iSmart credentials, missing channel-specific fields, and the final non-success disbursement outcome), matching the pattern `ismart-auth`/`ismart-checkout`/`wallet-withdraw` already use correctly. No frontend changes were needed — `DisbursementDialog.tsx`'s existing `data?.success` / `data?.message || data?.error` handling on line 320 now runs correctly since `data` is no longer discarded by a `FunctionsHttpError`.

**Verified live:** signed in locally, opened Send Money, entered an amount (GHS 50,000) exceeding the account's real wallet balance (GHS 915), selected Mobile Money, and submitted. Toast now correctly reads **"Insufficient wallet balance"** instead of the old generic message; the dialog stayed open (no false success) and the entered data was preserved for correction.

**CFDIS-06 (Verify Wallet) — low confidence:** code review shows `handleFetchWallet()` in `DisbursementDialog.tsx` is a pure local Supabase query against `business_profiles` — no edge function call at all, and RLS explicitly allows public read (`USING (true)`) on that table. This shouldn't produce "Edge function error" as written. Most likely QA's note was carried over from the adjacent CFDIS-05/07 failures in the same test session. **Needs a live retest** with the actual test data used to confirm current behavior before treating it as a distinct bug.

---

## D. Payment Links — shareable link 404s

**Test ID:** CLINK-06

**Root cause — confirmed via code.** `Collections.tsx` builds share URLs as `/pay/{shortCode}`, but the only registered route is `<Route path="/pay" .../>` (no `:shortCode` param), and the component mounted there (`OrderPayment.tsx`) only ever reads `?orderId=`/`?orderNumber=` query params — never a path segment. More significantly: **nothing in the codebase queries the `payment_links` table by `short_code` at all.** The entire receiving/payment side of this feature was never built — `ShortUrlRedirect.tsx` at `/s/:code` is a separate, unrelated URL-shortener feature that doesn't touch `payment_links`.

**Proposed fix (not applied):** add a real `/pay/:shortCode` route and a page that looks up `payment_links` by `short_code`, validates it (active/expired/fixed vs custom amount), and renders a checkout that reuses `ismart-checkout`. This is the largest-scope fix in this list — effectively a new feature, not a small patch.

---

## E. Airtime & Data Bundle issues

**Test IDs:** CAIR-04, CAIR-05, CAIR-07, CAIR-08 — all in `src/components/AirtimeDataDialog.tsx`

### CAIR-04 — "Verify Number" is a no-op for airtime
**Root cause:** for `type === "airtime"`, `handleQuery()` immediately does `setIsVerified(true)` with no network/network-cross-check call at all — the Data tab performs a real query; Airtime skips verification entirely regardless of what's entered.
**Proposed fix:** call a real verification (e.g. `iverify`'s mobile-money check, or a lightweight number/network cross-check) before marking verified, mirroring what the Data flow already does.

### CAIR-05 — Amount "0" bypasses validation — ✅ Fixed & verified
**Root cause:** both the submit guard (`if (!form.recipientNumber || !form.amount)`) and the Pay button's `disabled={... || !form.amount}` used falsy-string checks — the string `"0"` is truthy in JS, so it passed both checks. `handlePayment()` then sent `Amount: 0` to the real purchase endpoint, and whatever the upstream rejected with surfaced as a raw/unclear error.
**Fix applied:** both checks now validate `parseFloat(form.amount) > 0` explicitly — the submit guard shows a clear "Amount must be greater than 0" toast, and the Pay button's `disabled` condition catches it before the click even fires. Verified live: entering `0` keeps the button disabled, no request ever reaches the backend.

### CAIR-07 / CAIR-08 — Fetch Bundles shows nothing, purchase can't proceed — ✅ Fixed (best-effort, unverified against real API)
**Root cause (same for both — reproduced in local mock too):** the bundle-selection UI only rendered when `Array.isArray(queryResult)` was `true` (`AirtimeDataDialog.tsx` line ~236). `queryResult` was set directly from `result.data` with no shape checking, but the actual response almost certainly wraps the bundle list in an object (e.g. `{bundles: [...]}` or `{Data: [...]}`, the shape used everywhere else in this codebase) rather than being a bare array — so the check silently failed and the picker never rendered, even though the "Bundles fetched successfully" toast fired because the call itself succeeded.
**Fix applied:** added an `extractBundles()` helper that checks `bundles`/`Bundles`/`data`/`Data`/`items`/`Items`/`packages`/`Packages` keys (in addition to a bare array) and always returns a real array; `queryResult` is now normalized through it. Also made per-bundle field access resilient to casing (`id`/`Id`, `name`/`Name`, `amount`/`Amount`/`price`/`Price`), and added an explicit "No bundles available for this network right now" message (instead of a silently empty dropdown) for the case where the list really is empty.
Also added mock bundle data (`ismart-mock-client.ts`, local-dev only — `queryMTNData`/`queryTelecelData`/`queryATData` now return a `{bundles: [...]}` list of 4 sample plans) so the full flow could actually be exercised locally, not just the empty-state path. Verified live end-to-end: "Fetch Bundles" now populates a real dropdown ("1GB - 1 Day - GH₵5.00", "2GB - 7 Days - GH₵12.00", etc.), selecting one correctly fills in the bundle name and auto-fills the amount field, and the Pay button enables with the right total.
**Caveat:** the `extractBundles()` wrapper-key list (`bundles`/`Bundles`/`data`/`Data`/`items`/`Items`/`packages`/`Packages`) is still a best guess for the *real* iSmart response shape — the mock data was written by us, not sourced from a real API call. **Needs a live retest against the real API** to confirm the actual wrapper key is covered; if not, `extractBundles()` will need one more key added.

---

## F. Edit Product — image upload clearing data

**Test ID:** CPROD-10 — **Status: ✅ Fixed & verified**

**Root cause:** `ProductImageUpload.tsx`'s `handleFileSelect` was wrapped in `useCallback([user])`, freezing it (and every closure it captured) to its first-render state. It kept calling the *original* `onImageUploaded` closure from the parent dialog, which still saw the pristine, all-empty `formData` from mount — so every image upload re-merged into that stale snapshot and wiped out anything already typed.
**Fix applied:** removed the unnecessary `useCallback`, and switched the image-related `setFormData` calls in `NewInventoryDialog.tsx`/`EditProductDialog.tsx` to the functional updater form so they can never merge into a stale snapshot again. Verified live in both the Add and Edit dialogs — pre-filled data survives an image upload correctly.

---

## G. Orders Checkout — payment issues

**Test IDs:** COCHK-11, COCHK-17

### COCHK-11 — "Card" is selectable but never wired to anything
**Root cause — confirmed via code.** `OrderPayment.tsx` lets the user pick `paymentMethod: "card" | "momo"`, but `handlePayment()` never reads `paymentMethod` at all — it always calls `ismart-checkout` with `provider: "MTN"` hardcoded regardless of selection. Selecting "Card" silently does a MoMo attempt instead.
**Proposed fix:** either implement a real card flow (a distinct provider/endpoint), or remove the Card option from the UI until one exists — right now it's dead UI.

### COCHK-17 — "Send Payment Link" generates nothing visible
**Root cause — confirmed via code.** This is a separate mechanism from the Collections payment-link feature: `handleSendPaymentLink` in `Payment.tsx` builds a `/track-order?orderNumber=...` link (a route that does exist and works) but **queues it as an SMS for admin approval** (`createSMSAction(..., 'high')`) instead of displaying/copying the link directly. The merchant sees only "queued for admin approval" — no link is shown on screen and nothing is sent immediately.
**Proposed fix:** show the generated link directly in the UI (with a copy button), independent of whether the SMS itself gets approved and sent later.

---

## H. Branch stock assignment not validated

**Test ID:** CBRN-05

**Root cause — confirmed via code.** `BranchInventoryManager.tsx` sets `max={item.quantity}` on the assignment quantity input — that's a cosmetic HTML hint only and does not block typed/pasted values exceeding it. `handleAssign()` upserts `assignQuantities[itemId] || 0` straight through with no comparison against `item.quantity` before saving.
**Proposed fix:** add an explicit check before the upsert (`if (qty > item.quantity) { toast.error("Cannot assign more than available stock"); return; }`), and ideally clamp the input on change too.

---

## I. Wallet withdrawal & disbursement silent DB failures

**Test ID:** CFWAL-07 — **Status: ✅ Fixed & verified**

**Root cause:** two separate, real (not local-dev-specific) bugs found while verifying the full withdrawal/disbursement flow:
1. `process-disbursement/index.ts` inserted a `channel_type` column into `disbursements` that has never existed in any migration, and updated an `updated_at` column that also doesn't exist there — both writes silently failed (the code never checked the insert/update error), so **every disbursement in production silently failed to create a record**, even though the wallet was correctly debited and the user saw "success".
2. `wallet-withdraw/index.ts` inserted `transaction_type: "withdrawal"` into `wallet_transactions`, which isn't a valid enum value (`collection | disbursement | wallet_credit | wallet_debit | transfer | fee`) — same silent-failure pattern for every withdrawal.

**Fix applied:** moved `channel_type` into `metadata`, dropped the nonexistent `updated_at` reference, corrected the enum to `wallet_debit` (matching the convention `wallet-topup` already uses for credits), and added error logging to both so a future schema drift shows up in logs instead of silently vanishing. Verified live: a real `disbursements` row and `wallet_transactions` row now get created correctly.

---

## J. Utility payment reference mismatch

**Test ID:** CFUTL-07

**Root cause — confirmed via code.** `utility_payments.reference` is a DB-generated column (`generate_transaction_reference('UTL')`), but `AirtimeDataDialog.tsx` sends a *different*, self-generated `ClientReference` (e.g. `AIRTIME-1736500000000`) to iSmart when initiating the purchase — and the insert doesn't even chain `.select()` to read the real DB row back. The two references are never the same value anywhere. Result: `ismart-callback`'s webhook can never match the transaction by reference, so it stays `pending`; eventually the status-check reconciliation fallback queries the *wrong* reference against the real gateway, gets a not-found/error response, and `ismart-status-check`'s `mapStatus()` defaults anything that isn't literally `"success"`/`"pending"` straight to `"failed"` — producing exactly the reported pending→failed transition.
**Proposed fix:** insert the `utility_payments` row first (with `.select()`), then use its real DB-generated `reference` as the `ClientReference` sent to iSmart, so webhook/reconciliation can actually match it later. Separately worth tightening: `ismart-status-check`'s blanket default-to-`failed` for any unrecognized status is too aggressive on its own (flagged independently during an earlier session).

---

## K. Add Team Member silently does nothing

**Test IDs:** CTSTF-05, CTSTF-08

**Root cause — reproduced live and confirmed precisely.** `NewStaffDialog.tsx`'s Phone Number field is `required`, but its label has no asterisk (unlike Name/Email) and there is zero error feedback when it's left empty — the browser's native HTML5 form validation silently blocks submission. Confirmed via network inspection: submitting with Phone empty fired **zero network requests** and showed no toast, no console error, nothing. Filling in the phone number on the otherwise-identical form succeeded immediately — staff created, branch assignment applied correctly, invite sent. This proves Branch Assignment (CTSTF-05) itself works fine; testers simply never got past the invisible phone requirement to reach it.

**Proposed fix:** add a visible required-indicator (asterisk/hint) on Phone Number matching Name/Email, and/or reconsider whether phone should be required at all if it's not meant to be.

**Note:** QA's "failed to fetch" wording for CTSTF-08 doesn't match what was reproduced locally (a silent no-op, not a fetch error) — possibly a distinct, environment-specific issue with the `send-staff-invitation` edge function that couldn't be reproduced here. Worth a live retest with phone filled in on the real environment to see if a different error appears.

---

## Suggested fix order

1. ~~**Group C** (error-unwrapping)~~ ✅ done — affected 4 test IDs across Send Money and Disbursements.
2. **Group K** (Add Team Member phone requirement) — small, safe, single-field fix.
3. ~~**Group E** — CAIR-05 (amount validation)~~ ✅ done. **Group H** (branch stock cap) — small, independent, safe fix.
4. **Group J** (utility payment reference) — moderate scope, real production data-integrity issue.
5. **Group E** — CAIR-04 (airtime verification) and **Group G** — COCHK-11 (card flow) — need a product decision on what the "verified"/"card" experience should actually do before implementing.
6. **Group D** (CLINK-06) and **Group G** — COCHK-17 — largest scope, effectively new feature work (a real `/pay/:shortCode` page; a visible-link UI for the SMS-queued link).
7. **Group B**'s remaining real bug (`verify-account.ts` message clarity) — worth doing alongside Group C since it's the same class of "surface the real error" fix.

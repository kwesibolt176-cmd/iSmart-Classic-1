> **Tip for easy reading:** We recommend downloading the "Office Viewer (Markdown Editor)" extension in VS Code to view this markdown file as a formatted Word document.

# 5. API Documentation

Because iSmart Dowo uses Supabase as a Backend-as-a-Service (BaaS), it does not have a traditional Node.js/Express REST API. Instead, data interactions happen via two main channels:

1. **Direct Database Access via Supabase Client:** For standard CRUD operations (creating a product, updating a user profile), the frontend uses the `@supabase/supabase-js` library. Security is enforced at the database level using Row Level Security (RLS) policies.
2. **Supabase Edge Functions:** For complex, secure, or third-party logic, the frontend invokes Edge Functions.

This document focuses on the Edge Functions, as they serve as the custom API layer.

## Edge Function Architecture

Edge functions are located in the `supabase/functions/` directory. They are written in TypeScript and executed in a secure Deno environment. 

The frontend invokes them using a custom React hook: `use-ismart-api.ts`.

### Shared Utilities (`supabase/functions/_shared/`)
To prevent code duplication, common logic and API clients are stored in `_shared`.
- **`cors.ts`**: Provides standard CORS headers required for browsers to communicate with Edge Functions.
- **`ismart-full-client.ts`**: An object-oriented TypeScript client that wraps the external **iSmart Utilities API**. It provides methods like `queryElectricity()`, `buyWater()`, and `buyTelecelData()`. It handles setting the necessary authentication and `recipientid` headers.
- **`ismart-financial-client.ts`**: Similar to the above, but wraps the **iSmart Financial API** for operations like `createMoMoCollection()`, `walletTransfer()`, and `createMoMoDisbursement()`.

## Key Edge Functions

### 1. `ismart-utilities`
Handles all bill payments and utility verification.
- **Endpoint:** `POST /functions/v1/ismart-utilities`
- **Request Body Payload Structure:**
  ```json
  {
    "action": "queryElectricity" | "buyElectricity" | "buyWater" | "buyMTNData" | ...,
    "data": {
       // Category specific data, e.g., destination number, amount, bundle code
       "Destination": "024XXXXXXX",
       "Amount": 10
    },
    "businessId": "uuid-of-merchant" 
  }
  ```
- **Internal Logic:** Extracts the `action`, validates the user/business, instantiates `ISmartFullClient`, and routes the request to the corresponding method on the client.

### 2. `ismart-finance` / `ismart-collect-payment`
Handles digital wallet operations and collections.
- **Endpoint:** `POST /functions/v1/ismart-collect-payment`
- **Use Case:** Initiating a MoMo push to a customer's phone to collect payment.
- **Internal Logic:** Uses `ISmartFinancialClient` to interact with the core iSmart banking gateway.

### 3. `process-disbursement`
Handles sending money out of the wallet.
- **Endpoint:** `POST /functions/v1/process-disbursement`
- **Use Case:** Paying a supplier or transferring funds to a bank account.

### 4. `ismart-collect-*` Functions
A suite of functions managing iSmart Collect integrations for merchants that use iSmart Collect instead of, or alongside, the iSmart gateway.
- `ismart-collect-initialize`: Starts a transaction.
- `ismart-collect-verify`: Verifies a completed transaction.
- `ismart-collect-webhook`: Receives asynchronous updates from iSmart Collect regarding payment statuses.

### 5. `send-*` Functions (Communications)
Handles transactional emails and SMS.
- `send-payment-receipt`, `send-order-confirmation`, `send-staff-invitation`
- **Internal Logic:** Typically uses the `Resend` API for emails and the iSmart communications API for SMS.

## Authentication & Authorization

When calling an Edge Function from the frontend via the Supabase client (`supabase.functions.invoke()`), the user's JWT (JSON Web Token) is automatically included in the `Authorization: Bearer <token>` header.

Inside the Edge Function, this token is verified against Supabase Auth. Furthermore, critical functions will verify the user's role (e.g., ensuring only an admin or the business owner can initiate a disbursement).

Many functions require a `recipientid` or `businessId`. The edge functions extract the user ID from the verified JWT to prevent a user from passing a spoofed ID in the JSON body.

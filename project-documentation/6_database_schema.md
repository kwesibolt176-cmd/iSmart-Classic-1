> **Tip for easy reading:** We recommend downloading the "Office Viewer (Markdown Editor)" extension in VS Code to view this markdown file as a formatted Word document.

# 6. Database Schema

iSmart Dowo uses PostgreSQL hosted on Supabase. The schema is highly relational, utilizing UUIDs for primary keys and foreign key constraints to maintain data integrity.

## Core Entities & Tables

### 1. User & Business Management
- **`profiles`**: Extends the default Supabase `auth.users` table. Stores user-specific data (first name, last name, phone, role).
- **`businesses`**: The central entity for multi-tenancy. Represents a merchant or store.
  - *Key Fields:* `id`, `name`, `owner_id` (refs `profiles`), `wallet_balance`, `api_keys`.
- **`staff_members`**: Links a user (`profiles`) to a `business` with a specific `role` (e.g., admin, cashier, kitchen).
- **`locations`**: Physical locations or branches for a business.

### 2. POS & Inventory (Commerce)
- **`products`**: Items available for sale.
  - *Key Fields:* `business_id`, `name`, `price`, `stock_quantity`, `category_id`, `barcode`.
- **`categories`**: Groupings for products.
- **`orders`**: Represents a completed or pending sale.
  - *Key Fields:* `business_id`, `customer_id`, `total_amount`, `status` (pending, paid, completed, cancelled), `payment_method`.
- **`order_items`**: The line items for an order, linking to `products`.
- **`deliveries`**: Tracks delivery assignments and status for orders.

### 3. Fintech & Transactions
- **`transactions`**: The master ledger for all financial movements across the platform.
  - *Key Fields:* `business_id`, `type` (sale, topup, withdrawal, utility_payment, refund), `amount`, `status`, `reference`.
- **`utility_payments`**: Specific records for utility bills paid through the platform.
  - *Key Fields:* `transaction_id`, `provider` (e.g., ECG, GWCL), `account_number`, `amount`.
- **`settlements`**: Records of funds transferred from the platform's master holding account to a merchant's actual bank/MoMo account.

### 4. CRM & Customer Engagement
- **`customers`**: End-users who purchase from a business.
  - *Key Fields:* `business_id`, `name`, `phone`, `email`, `loyalty_points`.
- **`loyalty_programs`**: Rules defined by a business for point accumulation and redemption.
- **`reservations`**: Table bookings for restaurant-type businesses.

## Security: Row Level Security (RLS)

A critical component of the schema is Supabase Row Level Security (RLS). Because the frontend talks directly to the database, RLS prevents tenants from seeing each other's data.

**Example Policy Concept:**
A policy on the `products` table ensures that a user can only `SELECT`, `UPDATE`, or `DELETE` a product if:
1. They are the owner of the `business` the product belongs to (checked via `businesses.owner_id == auth.uid()`).
2. OR, they are an active staff member of that business with the appropriate role (checked via the `staff_members` table).

*Note: For the exact SQL definitions, refer to the `supabase/migrations/` folder, which contains the complete history of schema changes.*

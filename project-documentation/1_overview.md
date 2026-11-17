> **Tip for easy reading:** We recommend downloading the "Office Viewer (Markdown Editor)" extension in VS Code to view this markdown file as a formatted Word document.

# 1. Project Overview

## What the Project Does

The iSmart Dowo (often referenced internally as iSmartPay White-label) is a comprehensive, multi-tenant platform designed to unify business operations, point-of-sale (POS) capabilities, and fintech services into a single, cohesive application. 

It provides businesses with a central dashboard to manage everything from daily sales and inventory to complex financial operations like receiving mobile money payments, paying utility bills, and managing disbursements. The platform supports a "Super Admin" interface for platform-wide management and a "Main App" interface for individual businesses and merchants.

## Problem it Solves

Small to medium-sized enterprises (SMEs) often rely on disjointed software solutions to run their operations—one system for POS, another for accounting, a separate terminal for accepting digital payments, and distinct portals for utility payments or bulk disbursements. 

iSmart Dowo solves this fragmentation by offering an all-in-one suite. It integrates:
- **Commerce:** POS, order tracking, inventory management, and self-serve ordering.
- **Fintech:** Digital wallet management, automated collections (iSmart Collect/Mobile Money), bulk disbursements, and utility payments (Electricity, Water, Internet, Broadband, TV).
- **Business Management:** Staff management, role-based access control, accounting, and tax reporting.
- **Customer Engagement:** Loyalty programs, customer portals, and campaign management.

By consolidating these functions, businesses reduce operational overhead, gain real-time visibility into their finances, and simplify their daily workflows.

## Target Users

The platform is built for a diverse range of users, primarily categorized into:

1. **Super Admins (Platform Owners):**
   - Manage the entire ecosystem, including businesses, global configurations, platform-wide settlements, and high-level financial reporting.
   - Access the platform via the `control.getdowo.online` domain.

2. **Merchants & Business Owners:**
   - Retailers, restaurant owners, and service providers who need a POS system and financial dashboard.
   - Manage their specific store, staff, inventory, and digital wallet.
   - Access the platform via the `getdowo.online` domain.

3. **Staff Members:**
   - Employees of the merchants (e.g., cashiers, kitchen staff, delivery drivers) who interact with specific modules like the POS, Kitchen Display, or Deliveries based on their assigned roles and permissions.

4. **End Customers:**
   - Interact with the platform indirectly via receipts, invoices, public storefronts (`/store/:userId`), order tracking pages (`/track-order`), and self-serve order links (`/order/:token`).

> **Tip for easy reading:** We recommend downloading the "Office Viewer (Markdown Editor)" extension in VS Code to view this markdown file as a formatted Word document.

# 2. Architecture

The iSmart Dowo platform is built on a modern, serverless architecture that strictly separates the frontend user interface from backend data storage and complex business logic.

## System Design Overview

The application utilizes a **Monolithic Frontend** paired with a **Serverless Backend** architecture. 

- **Frontend:** A Single Page Application (SPA) built with React and Vite. It handles all user interactions, routing, state management, and UI rendering.
- **Backend (BaaS):** Supabase serves as the primary backend, providing a PostgreSQL database, Authentication, Storage, and Edge Functions.
- **Microservices (via Edge Functions):** Complex logic, third-party integrations (like payment gateways and utility APIs), and secure operations are offloaded to Supabase Edge Functions.

This architecture ensures that the frontend remains fast and responsive while securely handling sensitive financial operations in isolated, server-side environments.

## Frontend / Backend Separation

### Frontend Layer
- **Framework:** React 18 using TypeScript.
- **Build Tool:** Vite for fast HMR (Hot Module Replacement) and optimized production builds.
- **Routing:** React Router v7 is used for client-side routing.
- **State Management:** 
  - **Server State:** TanStack Query (React Query) handles fetching, caching, and updating asynchronous data from Supabase.
  - **Global State:** React Context (e.g., `BusinessContext`, `CartContext`, `StaffAuthContext`) is used for application-wide state that doesn't fit into the server-state model.
- **Styling:** Tailwind CSS combined with `shadcn-ui` components for a consistent, accessible, and highly customizable design system.

### Backend Layer (Supabase)
- **Database:** PostgreSQL. The frontend communicates directly with the database using the `@supabase/supabase-js` client for standard CRUD operations, leveraging Row Level Security (RLS) policies to ensure users can only access their own data.
- **Authentication:** Supabase Auth handles user sign-ups, logins, and session management.
- **Edge Functions:** Deno-based serverless functions deployed to Supabase. These act as the "true backend" for operations that cannot or should not be done on the client, such as:
  - Integrating with the iSmart Financial API for utility payments and disbursements.
  - Initializing and verifying iSmart Collect transactions.
  - Sending emails (via Resend) and SMS messages.
  - Processing webhooks.

## Data Flow

1. **Client Request:** The user interacts with the React frontend (e.g., clicks "Pay Utility").
2. **State Update:** The frontend updates local state and prepares a payload.
3. **API Call:** 
   - *If it's a simple CRUD operation:* The frontend uses the Supabase JS client to insert/update data directly into PostgreSQL (subject to RLS).
   - *If it involves complex logic/third-parties:* The frontend calls a Supabase Edge Function (e.g., `ismart-utilities`) using `supabase.functions.invoke()`.
4. **Edge Function Execution:** The Edge Function securely executes the logic, communicates with external APIs (like the iSmart Gateway), and optionally updates the database.
5. **Response & Cache Invalidation:** The Edge Function returns a response. TanStack Query receives the response and invalidates relevant caches, causing the UI to re-render with the latest data.

## Domain-Based Routing

The platform employs a unique routing strategy to serve different interfaces from the same codebase based on the domain name. This is managed by the `useDomainContext` hook and the main `App.tsx` router.

- **`control.getdowo.online`**: Accesses the **Super Admin** interface. The router restricts access to platform-management pages (`/admin`).
- **`getdowo.online`**: Accesses the **Main Application** interface. This is where merchants log in to access their POS, Fintech dashboard (`/wallet`, `/utilities`), and settings.
- **Public Routes:** Certain routes like `/store/:userId` (Public Storefront) and `/receipt` are accessible globally regardless of the specific subdomain.

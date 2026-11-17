> **Tip for easy reading:** We recommend downloading the "Office Viewer (Markdown Editor)" extension in VS Code to view this markdown file as a formatted Word document.

# 8. Dependencies

The iSmart Dowo project relies on a robust set of modern web technologies. This document outlines the key libraries used and the rationale behind their selection.

## Core Technologies

- **React (v18):** The foundational UI library for building the Single Page Application (SPA).
- **TypeScript:** Adds static typing to JavaScript, improving developer experience, code quality, and reducing runtime errors.
- **Vite:** The build tool and development server. Chosen over Webpack/Create React App for its incredibly fast Hot Module Replacement (HMR) and optimized build speeds.
- **Supabase:** The Backend-as-a-Service (BaaS) providing PostgreSQL, Authentication, Storage, and Edge Functions.

## Frontend Libraries

### UI & Styling
- **Tailwind CSS:** A utility-first CSS framework used for rapid, consistent styling without leaving the HTML/JSX.
- **shadcn-ui:** A collection of re-usable components (built on top of Radix UI and Tailwind). It is not a traditional dependency installed via npm, but rather a set of files copied into `src/components/ui/` that provides accessible, unstyled primitives which are then styled with Tailwind.
- **Radix UI (`@radix-ui/react-*`):** Unstyled, accessible UI primitives (e.g., Dialog, Select, DropdownMenu) used as the foundation for `shadcn-ui` components.
- **Lucide React (`lucide-react`):** The primary icon library used throughout the application.
- **Recharts:** A composable charting library used for rendering data visualizations in the Super Admin and merchant dashboards.

### State Management & Data Fetching
- **TanStack Query (React Query) (`@tanstack/react-query`):** Manages server state. It handles data fetching, caching, synchronization, and optimistic updates.
- **React Hook Form (`react-hook-form`):** Used for building performant, flexible, and extensible forms with easy-to-use validation.
- **Zod (`zod`):** A TypeScript-first schema declaration and validation library. Often paired with React Hook Form (`@hookform/resolvers`) to validate user input before submission.

### Routing & Navigation
- **React Router (`react-router-dom`):** Handles client-side routing, enabling navigation between different views without full page reloads.

### Utilities
- **date-fns:** A comprehensive toolkit for parsing, formatting, and manipulating dates (e.g., used in reporting and transaction histories).
- **Sonner (`sonner`) & Radix Toast:** Used for displaying non-intrusive notification toasts to the user.
- **Papaparse (`papaparse`):** Used for parsing CSV data (e.g., bulk importing products or reading settlement reports).
- **qrcode.react:** Generates QR codes on the client side, typically used for rendering MoMo payment QR codes or generating self-serve order links.

## Backend Libraries (Edge Functions)
Because Edge Functions run in Deno, they do not use `package.json` dependencies in the same way. However, they rely on:
- **Deno standard libraries:** For HTTP handling, crypto, etc.
- **Supabase JS (`@supabase/supabase-js`):** Used inside the edge functions (often with the `SERVICE_ROLE` key) to bypass RLS when performing trusted, secure database operations.
- **External API Integrations:** Functions interact directly via `fetch` with the iSmart Gateway, iSmart Collect API, and Resend (for emails).

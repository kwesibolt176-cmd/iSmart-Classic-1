> **Tip for easy reading:** We recommend downloading the "Office Viewer (Markdown Editor)" extension in VS Code to view this markdown file as a formatted Word document.

# 10. Developer Guide

This guide outlines the conventions and patterns used in the iSmart Dowo codebase to help new developers maintain consistency when adding features.

## Coding Conventions

### React & Frontend
- **Functional Components:** All React components should be written as functional components using hooks. Avoid class components.
- **Component File Structure:** 
  - Complex pages should be placed in `src/pages/` and lazy-loaded in `App.tsx`.
  - Reusable, generic UI components (buttons, dialogs) belong in `src/components/ui/`.
  - Domain-specific components (e.g., `LocationManagement.tsx`) belong in the root of `src/components/`.
- **Styling:** Use Tailwind CSS utility classes. If a component requires dynamic classes, use the `cn()` utility function from `src/lib/utils.ts` (which wraps `clsx` and `tailwind-merge`).
  ```tsx
  import { cn } from "@/lib/utils";
  
  <div className={cn("base-classes", isActive && "active-classes")} />
  ```
- **Icons:** Use `lucide-react`.

### State Management
- **Avoid Prop Drilling:** If state needs to be accessed deeply, use React Context (e.g., `BusinessContext`).
- **Server State:** Use TanStack Query (`useQuery`, `useMutation`) for all interactions with Supabase or Edge Functions. Do not use `useEffect` for data fetching unless absolutely necessary.
  ```tsx
  // Good
  const { data } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  ```

## How to Add a New Feature

### Adding a New Page
1. **Create the Component:** Create your new file in `src/pages/NewFeature.tsx`.
2. **Add to Router:** Open `src/App.tsx`.
3. **Lazy Load:** Add a lazy import: `const NewFeature = lazy(() => import("./pages/NewFeature"));`
4. **Define Route:** Add the `<Route />` inside the appropriate domain block (e.g., under `domainContext === "app"`).
5. **Add Navigation:** Update the Sidebar or Topbar component to include a link to your new route.

### Adding a New Supabase Edge Function
1. **Create Directory:** `mkdir supabase/functions/my-new-function`
2. **Create Index File:** Create `index.ts` inside the new folder.
3. **Handle CORS:** Always import and use the shared CORS headers to support browser preflight requests.
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
   import { corsHeaders } from "../_shared/cors.ts";

   serve(async (req) => {
     if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
     // ... your logic ...
   });
   ```
4. **Deploy:** `supabase functions deploy my-new-function`
5. **Call from Frontend:** Use the Supabase client:
   ```typescript
   const { data, error } = await supabase.functions.invoke('my-new-function', { body: { key: 'value' } });
   ```

## Dealing with the iSmart Gateway API
When adding new fintech features that rely on the iSmart Gateway:
1. Do not make `fetch` requests directly to the gateway from the frontend to avoid exposing API keys.
2. Update `supabase/functions/_shared/ismart-full-client.ts` or `ismart-financial-client.ts` to add the new gateway endpoint method.
3. Create or update an Edge Function to act as a secure proxy between the frontend and the shared client.

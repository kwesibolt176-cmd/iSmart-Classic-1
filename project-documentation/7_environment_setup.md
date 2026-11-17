> **Tip for easy reading:** We recommend downloading the "Office Viewer (Markdown Editor)" extension in VS Code to view this markdown file as a formatted Word document.

# 7. Environment Setup

This guide will help you set up the iSmart Dowo platform on your local machine for development.

## Prerequisites

Ensure you have the following installed on your machine:
1. **Node.js** (v18 or higher recommended) - [Download](https://nodejs.org/)
2. **npm** (comes with Node.js) or **bun** (if preferred, given the presence of `bun.lockb`).
3. **Supabase CLI** - Required if you need to run or deploy Edge Functions. [Installation Guide](https://supabase.com/docs/guides/cli)
4. **Git**

## Setup Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ismartpay-white-label
```

### 2. Install Dependencies
```bash
npm install
# OR
bun install
```

### 3. Environment Variables
Create a `.env` file in the root of the project. You will need to obtain the specific keys from your Supabase project settings and any third-party providers (like iSmart Collect).

A typical `.env` file looks like this:
```env
# Supabase Configuration (Required for Frontend)
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Lovable Configuration (If applicable for UI deployment)
VITE_LOVABLE_PROJECT_ID="your-project-id"
```

*Note: The Edge Functions rely on their own set of environment variables stored securely within the Supabase dashboard (e.g., `ISMART_API_KEY`, `ISMART_COLLECT_SECRET_KEY`). If you are running functions locally via the CLI, you will need a `.env.local` file inside the `supabase/` directory.*

### 4. Run the Development Server
```bash
npm run dev
# OR
bun run dev
```
The application will start, typically on `http://localhost:8080` (or another port if specified by Vite).

## Simulating Domains Locally

Because the application uses domain-based routing (`control.getdowo.online` vs `getdowo.online`), testing locally requires simulating these hostnames.

By default, accessing `localhost` will load the Main App. 

To test the Super Admin interface locally, you may need to map a local domain in your operating system's `hosts` file:
1. Open your `hosts` file (e.g., `/etc/hosts` on Mac/Linux, `C:\Windows\System32\drivers\etc\hosts` on Windows).
2. Add the following line:
   ```
   127.0.0.1 control.localhost
   ```
3. Run your dev server and access `http://control.localhost:8080`.

## Deployment

The frontend of this application can be deployed to any static host supporting Vite (e.g., Vercel, Netlify, Cloudflare Pages, Lovable).

### Build Command
```bash
npm run build
```
The output will be placed in the `/dist` directory.

### Deploying Edge Functions
If you modify anything in the `supabase/functions/` directory, you must deploy the changes to Supabase using the CLI:
```bash
supabase functions deploy <function-name>
```

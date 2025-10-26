# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d85ed966-b48f-4101-9b1d-924ee16b0051

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d85ed966-b48f-4101-9b1d-924ee16b0051) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d85ed966-b48f-4101-9b1d-924ee16b0051) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Run locally (Windows)

1. Install a runtime:
	 - Node.js LTS: `winget install OpenJS.NodeJS.LTS`
	 - or Bun: `powershell -c "irm bun.sh/install.ps1 | iex"`
2. Copy `.env.example` to `.env` and fill in your keys (Supabase URL + anon key). Optional: set launch code expiry (ISO date).
3. Install dependencies and start dev server:
	 - npm:
		 ```powershell
		 cd "c:\Users\Daniil\Documents\Readypixelgo webbsida\session-select"
		 npm install
		 npm run dev
		 ```
	 - bun:
		 ```powershell
		 cd "c:\Users\Daniil\Documents\Readypixelgo webbsida\session-select"
		 bun install
		 bun run dev
		 ```
4. Open http://localhost:8080

## Environment variables

See `.env.example`. Important keys:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (required)
- `VITE_LAUNCH_CODE`, `VITE_LAUNCH_CODE_EXPIRY`, `VITE_LAUNCH_DISCOUNT_PERCENT` (optional)
 - `SUPABASE_DB_URL` (optional, server-only): Use for admin tools/CI only; never expose to the browser.

## Supabase migrations

This repo includes a migration to create a `waitlist` table with RLS allowing anonymous inserts for the launch email form. Apply it with the Supabase CLI or via SQL in your project.

## Using the Postgres connection string safely

- Do not put the Postgres connection string (with password) into client-side env (`VITE_*`) or commit it to the repo.
- For scripts/CI or external tools, set `SUPABASE_DB_URL` in a secure secret store (GitHub Actions secrets, local `.env` not checked-in, Supabase project secrets).
- Our app and Edge Functions use `@supabase/supabase-js` with project URL + keys; direct Postgres access is not required for runtime.

## Edge Function secrets (Supabase)

Set the following secrets in your Supabase project for Edge Functions:

- `STRIPE_SECRET_KEY` (for create/verify payment)
- `RESEND_API_KEY` (for send-booking-confirmation and send-waitlist-email)
- `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` (used by functions for server-side DB access)

# 🚀 Supabase VS Code Extension Setup Guide

## ✅ Extension Installed

The **Supabase Extension for VS Code** has been installed successfully!

## 📋 How to Use the Extension

### 1. Open Supabase Panel
- Click on the **Supabase icon** in the Activity Bar (left sidebar)
- Or use Command Palette (Ctrl+Shift+P) and search for "Supabase"

### 2. Login to Supabase
1. In the Supabase panel, click **"Login to Supabase"**
2. A browser window will open
3. Log in with your Supabase credentials
4. Authorize VS Code to access your projects

### 3. View Your Project
Once logged in, you should see:
- **Your project:** klpkxpzvwwdpnalegpre
- Database tables
- Edge Functions
- Storage buckets
- Authentication settings

## 🔑 Your Credentials

### Project Details
- **Project ID:** klpkxpzvwwdpnalegpre
- **Project URL:** https://klpkxpzvwwdpnalegpre.supabase.co
- **Anon Key:** Already configured in .env file

### Where to Find More Keys
1. Go to: https://supabase.com/dashboard/project/klpkxpzvwwdpnalegpre/settings/api
2. You'll find:
   - **Project URL**
   - **anon/public key** (for client-side)
   - **service_role key** (for server-side, keep secret!)

## 🧪 Testing Your Connection

### Option 1: Use the Test Page (Easiest)
I've created a test page that just opened in your browser:
- **File:** `test-supabase-connection.html`
- Click the buttons to test:
  - ✅ Connection Test
  - 💾 Database Test
  - ⚡ Edge Functions Test

### Option 2: Use VS Code Extension
1. Open Supabase panel in VS Code
2. Click on your project
3. Browse tables, functions, etc.
4. Run SQL queries directly from VS Code

### Option 3: Command Line (requires Supabase CLI)

**To install Supabase CLI:**

Since you have PowerShell execution policy restrictions, download the CLI manually:
1. Go to: https://github.com/supabase/cli/releases
2. Download: `supabase_windows_amd64.exe`
3. Rename to: `supabase.exe`
4. Add to your PATH or move to project folder

**Or enable scripts and use npm:**
```powershell
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy RemoteSigned

# Then install:
npm install -g supabase
```

**After installation:**
```bash
# Login
supabase login

# Link project
supabase link --project-ref klpkxpzvwwdpnalegpre

# Check status
supabase status
```

## 🎯 Next Steps

### 1. Verify Database Tables
Check if your database tables exist:
- Open Supabase panel in VS Code
- Look for `bookings` table
- If missing, you need to run migrations

### 2. Deploy Edge Functions
Your payment system needs these functions deployed:
```bash
supabase functions deploy create-payment
supabase functions deploy verify-payment
supabase functions deploy send-booking-confirmation
```

### 3. Add Stripe Secret Key
In Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/klpkxpzvwwdpnalegpre/settings/functions
2. Click "Add new secret"
3. Name: `STRIPE_SECRET_KEY`
4. Value: Your Stripe secret key (sk_test_...)

## 🔍 Troubleshooting

### Extension Not Showing?
- Restart VS Code
- Check Activity Bar for Supabase icon
- Use Command Palette: Ctrl+Shift+P → "Supabase"

### Can't Login?
- Make sure you have a Supabase account
- Create one at: https://supabase.com
- Use the same credentials you used to create the project

### Tables Not Showing?
- You may need to run migrations
- Check test page results
- Verify in Supabase Dashboard

### Functions Showing as Not Deployed?
- Deploy them using Supabase CLI
- Or deploy from Supabase Dashboard
- See SETUP_INSTRUCTIONS.md for detailed steps

## 📚 Useful Resources

- [Supabase Docs](https://supabase.com/docs)
- [VS Code Extension Docs](https://supabase.com/docs/guides/getting-started/vscode)
- [Supabase Dashboard](https://supabase.com/dashboard/project/klpkxpzvwwdpnalegpre)
- [CLI Reference](https://supabase.com/docs/reference/cli)

## 💡 Pro Tips

1. **Use Extension for Quick Access:** Browse tables, run queries, view logs without leaving VS Code
2. **Autocomplete:** The extension provides SQL autocomplete for your schema
3. **Live Logs:** View function logs in real-time from VS Code
4. **Schema Inspector:** Easily view and modify your database schema

---

**Test Page:** Open `test-supabase-connection.html` in your browser to verify connection!

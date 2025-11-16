# Fixing Stripe Payment Integration

## The Problem
Your booking system is failing because:
1. **Edge functions are not deployed** to Supabase
2. **Stripe secret key is not configured** in Supabase
3. **Using LIVE Stripe key with TEST card numbers** (won't work)

## Solution: Deploy Edge Functions & Configure Stripe

### Step 1: Install Supabase CLI

**Option A: Using Scoop (Recommended for Windows)**
```powershell
# Install Scoop if you don't have it
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Option B: Direct Download**
1. Go to: https://github.com/supabase/cli/releases
2. Download `supabase_windows_amd64.zip`
3. Extract and add to your PATH

**Option C: Using npm**
```powershell
npm install -g supabase
```

### Step 2: Login and Link Project

```powershell
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref klpkxpzvwwdpnalegpre
```

### Step 3: Get Stripe Test Keys

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy:
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)

### Step 4: Update Your .env File

Replace your LIVE Stripe key with TEST key:

```env
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_your_test_key_here"
```

### Step 5: Set Stripe Secret in Supabase

**Option A: Using Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/klpkxpzvwwdpnalegpre/settings/secrets
2. Click "New secret"
3. Name: `STRIPE_SECRET_KEY`
4. Value: Your Stripe SECRET key (sk_test_...)
5. Click "Save"

**Option B: Using CLI**
```powershell
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### Step 6: Deploy Edge Functions

```powershell
# Deploy all payment functions
supabase functions deploy create-payment
supabase functions deploy verify-payment
supabase functions deploy send-booking-confirmation
```

### Step 7: Restart Your Dev Server

```powershell
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## Testing the Fix

1. Open your booking page
2. Select a date and time
3. Fill in contact details:
   - Email: test@example.com
   - Phone: +46 70 123 45 67
4. Use test card: **4242 4242 4242 4242**
   - Expiry: Any future date (12/34)
   - CVC: Any 3 digits (123)
5. Click "Complete Booking"
6. You should be redirected to Stripe checkout

## Check Browser Console

Open browser DevTools (F12) and look for:
```
Creating payment with data: {...}
Supabase function response: {...}
```

If you see errors, they'll tell you exactly what's wrong.

## Common Errors & Solutions

### Error: "FunctionsRelayError" or "Function not found"
- **Solution**: Edge functions not deployed. Run `supabase functions deploy create-payment`

### Error: "STRIPE_SECRET_KEY is not set"
- **Solution**: Set the secret in Supabase Dashboard or via CLI (Step 5)

### Error: "No such customer" or "Invalid card"
- **Solution**: You're using LIVE key with TEST card. Switch to TEST keys (Step 3-4)

### Error: "Failed to create payment session"
- **Solution**: Check Supabase function logs:
  ```powershell
  supabase functions logs create-payment
  ```

## Verify Deployment

```powershell
# List deployed functions
supabase functions list

# Check function logs
supabase functions logs create-payment --tail
```

You should see your function listed and any error logs will appear when testing.

## Quick Test Checklist

- [ ] Supabase CLI installed and logged in
- [ ] Project linked (`supabase link`)
- [ ] Stripe TEST keys obtained
- [ ] `.env` updated with TEST publishable key
- [ ] Stripe secret key set in Supabase
- [ ] Edge functions deployed
- [ ] Dev server restarted
- [ ] Browser console open for debugging
- [ ] Test card ready (4242 4242 4242 4242)

After completing these steps, the test card should work! 🎉

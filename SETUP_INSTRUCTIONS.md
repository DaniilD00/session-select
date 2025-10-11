# Booking System Setup Instructions

## Prerequisites
- Stripe Account (https://stripe.com)
- Supabase Account (https://supabase.com)
- Supabase CLI installed

## Step 1: Stripe Configuration

### 1.1 Get Stripe API Keys
1. Login to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers → API Keys**
3. Copy both:
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)

### 1.2 Add to Local Environment
Update your `.env` file:
```env
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_your_key_here"
```

## Step 2: Supabase Configuration

### 2.1 Database Setup
Your database migrations should already be applied. Verify in Supabase Dashboard:
- Go to **Database → Tables**
- Check that `bookings` table exists

### 2.2 Add Stripe Secret to Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/klpkxpzvwwdpnalegpre)
2. Navigate to **Settings → Edge Functions**
3. Click **Add new secret**
4. Add:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** Your Stripe secret key (sk_test_...)

### 2.3 Get Supabase Service Role Key
1. In Supabase Dashboard, go to **Settings → API**
2. Copy the **service_role** key (not the anon key)
3. This will be used by edge functions

## Step 3: Deploy Edge Functions

### 3.1 Install Supabase CLI

**Windows (PowerShell):**
```powershell
npm install -g supabase
```

Or download from: https://github.com/supabase/cli/releases

**Mac/Linux:**
```bash
brew install supabase/tap/supabase
```

### 3.2 Login and Link Project
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref klpkxpzvwwdpnalegpre
```

### 3.3 Deploy Functions
```bash
# Deploy all edge functions
supabase functions deploy create-payment
supabase functions deploy verify-payment
supabase functions deploy send-booking-confirmation
```

### 3.4 Set Environment Variables for Functions
```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here
```

## Step 4: Test Your Setup

### 4.1 Check Function Deployment
```bash
supabase functions list
```

### 4.2 Test a Booking
1. Start your development server: `npm run dev`
2. Navigate to http://localhost:8080
3. Click "Book a Session"
4. Select date, time, and number of people
5. Fill in email and phone
6. Select payment method
7. Click "Complete Booking"

### 4.3 Use Stripe Test Cards
For testing, use these test card numbers:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0027 6000 3184

Any future expiry date and any 3-digit CVC works for test mode.

## Step 5: Check Logs

### Supabase Function Logs
```bash
supabase functions logs create-payment
supabase functions logs verify-payment
```

### Or in Dashboard
- Go to **Edge Functions** in Supabase Dashboard
- Click on a function name
- View logs in the **Logs** tab

## Troubleshooting

### Issue: "STRIPE_SECRET_KEY is not set"
- Make sure you added the secret in Supabase Dashboard
- Or use CLI: `supabase secrets set STRIPE_SECRET_KEY=sk_test_...`

### Issue: "Function not found"
- Deploy the functions: `supabase functions deploy function-name`
- Check deployment: `supabase functions list`

### Issue: Database Error
- Check table exists: Supabase Dashboard → Database → Tables
- Run migrations: `supabase db push`

### Issue: CORS Error
- Edge functions have CORS headers configured
- Make sure you're calling from the correct origin

## Production Deployment

### Before Going Live:
1. **Switch to Live Stripe Keys:**
   - Use `pk_live_...` and `sk_live_...`
   - Update in `.env` and Supabase secrets

2. **Enable Payment Method:**
   - In Stripe Dashboard, activate payment methods
   - Configure Swish, Klarna if needed (Sweden specific)

3. **Test Everything:**
   - Test bookings with real test cards
   - Verify email confirmations work
   - Check booking appears in database

4. **Set Up Webhooks (Optional but Recommended):**
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://klpkxpzvwwdpnalegpre.supabase.co/functions/v1/stripe-webhook`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`

## Support Resources
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

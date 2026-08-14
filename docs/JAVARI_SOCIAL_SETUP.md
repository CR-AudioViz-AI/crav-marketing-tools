# Javari Social - Production Setup Guide
## TIMESTAMP: Monday, December 30, 2025 - 8:18 AM EST

---

## ⚠️ CURRENT STATUS: 90% Complete

**What's Done:**
- ✅ All API routes deployed and building
- ✅ All UI pages deployed
- ✅ 5 Platform publishers (Discord, Slack, Telegram, Bluesky, Mastodon)
- ✅ Credit system with owner bypass
- ✅ Database schema created (in GitHub)

**What's BLOCKING Production:**
- ❌ Database tables not yet created in Supabase
- ❌ No end-to-end testing done

---

## STEP 1: Create Database Tables (5 minutes)

1. Go to: https://supabase.com/dashboard → Your Project → SQL Editor
2. Copy the ENTIRE contents from: `supabase/migrations/008_javari_social_complete.sql`
3. Click "Run"
4. Verify with: `SELECT * FROM js_platforms;` (should show 13 platforms)

---

## STEP 2: Enable Owner Bypass for You (1 minute)

After you create your first tenant, run this SQL:

```sql
-- Find your user ID first
SELECT id, email FROM auth.users WHERE email = 'royhenderson@craudiovizai.com';

-- Then update your tenant (replace YOUR_USER_ID)
UPDATE js_tenants 
SET is_owner_bypass = true, plan = 'agency', max_platforms = 100, max_posts_per_month = 999999
WHERE user_id = 'YOUR_USER_ID';
```

This gives you:
- ✅ No credit charges ever
- ✅ Agency plan features
- ✅ Unlimited platforms
- ✅ Unlimited posts

---

## STEP 3: Set Environment Variables (Vercel Dashboard)

Go to: Vercel → javari-marketing-tools → Settings → Environment Variables

```
CREDENTIALS_ENCRYPTION_KEY=cr-javari-your-secret-key-here-32ch
CRON_SECRET=cr-javari-cron-secret-2025
ADMIN_API_KEY=cr-javari-admin-2025
```

For Stripe (if using paid plans):
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_AGENCY_MONTHLY=price_...
STRIPE_PRICE_AGENCY_YEARLY=price_...
```

---

## STEP 4: Test End-to-End (10 minutes)

### Test 1: Create Your Tenant
```bash
curl -X POST https://YOUR-PREVIEW-URL.vercel.app/api/javari-social/tenants \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_SUPABASE_USER_ID", "name": "CR AudioViz AI"}'
```

### Test 2: Connect Discord
1. Go to Discord → Server Settings → Integrations → Webhooks → New Webhook
2. Copy webhook URL
3. Add connection via API:
```bash
curl -X POST https://YOUR-PREVIEW-URL.vercel.app/api/javari-social/connections \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "platformName": "discord",
    "credentials": {"webhook_url": "YOUR_DISCORD_WEBHOOK_URL"},
    "displayName": "CR AudioViz Discord"
  }'
```

### Test 3: Publish a Post
```bash
# Create post
curl -X POST https://YOUR-PREVIEW-URL.vercel.app/api/javari-social/posts \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "content": "🚀 Testing Javari Social! This is automated.",
    "targetPlatforms": ["discord"],
    "status": "draft"
  }'

# Publish it
curl -X POST https://YOUR-PREVIEW-URL.vercel.app/api/javari-social/publish \
  -H "Content-Type: application/json" \
  -d '{"postId": "THE_POST_ID", "tenantId": "YOUR_TENANT_ID"}'
```

---

## STEP 5: Add More Platforms

### Bluesky (Easy - No OAuth)
1. Go to bsky.app → Settings → App Passwords → Add App Password
2. Add connection with: `{"identifier": "your.handle", "app_password": "xxxx-xxxx-xxxx"}`

### Telegram (Easy - Bot Token)
1. Message @BotFather → /newbot → Get token
2. Add connection with: `{"bot_token": "123456:ABC...", "chat_id": "@yourchannel"}`

### Mastodon (Per-Instance OAuth)
1. Go to your instance → Preferences → Development → New Application
2. Add connection with: `{"instance_url": "https://mastodon.social", "access_token": "..."}`

---

## Platform Support Status

| Platform | Auth Type | Status | Notes |
|----------|-----------|--------|-------|
| Discord | Webhook | ✅ Ready | Just needs webhook URL |
| Slack | Webhook | ✅ Ready | Just needs webhook URL |
| Telegram | Bot Token | ✅ Ready | Create bot via @BotFather |
| Bluesky | App Password | ✅ Ready | No OAuth needed |
| Mastodon | OAuth | ✅ Ready | Per-instance tokens |
| Twitter/X | OAuth | ⏳ Pending | Need developer account approval |
| LinkedIn | OAuth | ⏳ Pending | Need developer account approval |
| Facebook | OAuth | ⏳ Pending | Need app review |
| Instagram | OAuth | ⏳ Pending | Need Facebook app review |

---

## Quick Test URLs

After database setup, test these:
- Dashboard: `/javari-social`
- Compose: `/javari-social/compose`  
- Connect: `/javari-social/connect`
- Analytics: `/javari-social/analytics`
- Pricing: `/javari-social/pricing`

---

## Architecture Summary

```
js_tenants (Customer accounts)
    └── js_brand_profiles (Multi-brand support)
    └── js_connections (Platform connections)
    └── js_posts (Content)
    └── js_campaigns (Marketing campaigns)
    └── js_team_members (Team access)
    └── js_usage_tracking (Monthly limits)
    └── js_analytics (Engagement data)

js_platforms (Reference: 13 platforms)
js_plan_configs (Reference: trial, starter, pro, agency)
```

---

## Common Issues

**"No tenant found"**
→ Run Step 1 (create database tables) then Step 2 (create tenant)

**"Insufficient credits"**  
→ Run Step 2 (enable owner bypass)

**"Failed to decrypt credentials"**
→ Set CREDENTIALS_ENCRYPTION_KEY in Vercel and redeploy

**Discord webhook not posting**
→ Verify webhook URL is correct, channel exists, webhook not deleted

---

## Success Criteria

You'll know it's production-ready when:
1. ✅ You can view the dashboard without errors
2. ✅ You can add a Discord/Slack/Telegram connection
3. ✅ You can create and publish a post
4. ✅ Post appears in your Discord/Slack/Telegram
5. ✅ No credits are deducted (owner bypass working)

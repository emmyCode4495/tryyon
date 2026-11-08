# Social Bot Integration (tryyON)

## Overview

Users who are already registered on tryyON can link their Telegram (and later WhatsApp / X) account.  
Once linked, every action on the bot uses and deducts from their real credit balance.

### Flow

1. User is logged in on the website → Profile → **Link Telegram**
2. Website generates a short code (`TRY-XXXXXX`) valid for 15 minutes
3. User opens the Telegram bot and sends the code
4. Bot links the Telegram user ID → TryyON `profiles.id`
5. From then on:
   - Send two photos (person + garment) → snapshot try-on (2 credits)
   - `/mirror` → receive a deep link to live Realtime Mirror (30 credits charged when session starts)
   - `/balance` → see current credits
   - Low credits → bot tells them to recharge on the website

## Database

Run the migration:

```sql
-- in Supabase SQL editor
\i supabase/social_links.sql
```

Or paste the contents of `supabase/social_links.sql`.

## Environment Variables

Add these to your Vercel / `.env.local`:

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...          # from @BotFather
NEXT_PUBLIC_APP_URL=https://your-domain.com  # used in bot messages
```

## Set Telegram Webhook

After deploying:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/bot/telegram"
```

Check status:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## Bot Commands (suggested to set in BotFather)

```
start - Start / link account
balance - Check your credit balance
mirror - Get a live Realtime Mirror link
```

## Files Added

| Path | Purpose |
|------|---------|
| `supabase/social_links.sql` | Tables: `social_links`, `social_link_codes` |
| `src/lib/social.ts` | Core helpers: lookup, spend credits, link codes |
| `src/app/api/bot/telegram/route.ts` | Telegram webhook |
| `src/app/api/social/link/route.ts` | Generate link code (website) |
| `src/app/api/social/status/route.ts` | List / unlink social accounts |

## Next Steps

1. Add a "Link Telegram" button on the Profile page that calls `POST /api/social/link`
2. Make `/studio` accept `?token=MIR-...` and resolve the user automatically
3. Add WhatsApp Business API (same linking pattern)
4. Move `pendingSessions` Map to Redis for multi-instance deployments

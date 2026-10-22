# Operations: running plangta.ca

How the live site is built, refreshed, backed up and kept healthy, and the few settings only the owner can change.

## What runs where

| Piece | Where | Notes |
|---|---|---|
| App and map (static files) | Cloudflare Workers static assets, Worker `gta-proforma`, plangta.ca + www | Free and unlimited requests; `npm run deploy` |
| Map data | Packed static files under `/map/data/` (`npm run map:pack`), about 580 MB in ~1,330 files | The map page answers searches and site lookups in the browser; no server compute |
| Accounts, projects, receipts | Supabase project `gcrhvqwexeukvsxkpvdu` (Canada Central) | Free plan |
| Permanent deletion | Supabase Edge Function `account` + `public.erase_owner_data` (service role only) | See D-26 |
| Database backups | R2 bucket `plangta-backups` (private), nightly, encrypted, kept 35 days | Receipt files are not in the dump |

## Daily refresh (`.github/workflows/refresh-and-deploy.yml`)

Every day at 05:00 Toronto time GitHub Actions downloads fresh public data (`map:collect --refresh`, `map:collect:regional --refresh`), verifies counts and hashes, packs the map, builds and deploys. Only changed files upload. If any step fails nothing deploys, so the last good data stays live. The run also makes one harmless request to Supabase so the free project doesn't pause after a week without activity. Run it any time from the Actions tab ("Run workflow").

## One-time setup (owner)

### GitHub repository settings → Secrets and variables → Actions

| Name | Kind | Value |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | A Cloudflare API token with **Workers Scripts: Edit** and **Workers R2 Storage: Edit** (create it at dash.cloudflare.com → My Profile → API Tokens, scoped to this account) |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | `81382f9b2e06bc42d9ef6e1ae2c91144` |
| `SUPABASE_DB_URL` | Secret | Supabase dashboard → Connect → Session pooler connection string (with the database password) |
| `BACKUP_PASSPHRASE` | Secret | A long random passphrase. Keep a copy somewhere safe: backups can't be restored without it |
| `VITE_SUPABASE_URL` | Variable | `https://gcrhvqwexeukvsxkpvdu.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Variable | The publishable key from `.env.local` (public by design) |

Never put the Supabase service role key or the database password anywhere except these secrets.

### Supabase dashboard

1. **Authentication → URL Configuration:** Site URL `https://plangta.ca`. Redirect URLs: `https://plangta.ca/**`, `https://www.plangta.ca/**`, `https://gta-proforma.azharmoolla.workers.dev/**`, `http://localhost:5180/**`.
2. **Authentication → Emails → SMTP settings:** the built-in sender is rate-limited to a few emails an hour, enough for testing only. Choose one:
   - **Cloudflare Email Service** (needs Workers Paid, US$5/month): onboard plangta.ca under Email Service → Email Sending, create an API token with **Email Sending: Edit**, then in Supabase set host `smtp.mx.cloudflare.net`, port `465`, username `api_token`, password the token, sender `no-reply@plangta.ca`.
   - **Another SMTP provider** with a free tier (for example Resend or Postmark): verify plangta.ca with them and paste their SMTP settings.
3. **Privacy contact:** pick an address (for example privacy@plangta.ca forwarded to your inbox with Cloudflare Email Routing, which is free) and set `PRIVACY_CONTACT` in `src/ui/Legal.tsx`.

## Restoring a backup

```sh
npx wrangler r2 object get plangta-backups/db/2026-10-22.tgz.enc --file backup.tgz.enc --remote
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in backup.tgz.enc -out backup.tgz -pass pass:'<BACKUP_PASSPHRASE>'
tar xzf backup.tgz   # schema.sql and data.sql
psql "$SUPABASE_DB_URL" -f schema.sql && psql "$SUPABASE_DB_URL" -f data.sql   # into an empty project
```

Receipt files live in Supabase Storage and are not in the dump; the free plan has no storage backups. For a full copy, download the `receipts` bucket from the dashboard periodically, or move receipts to R2 later.

## Local commands

| Command | What it does |
|---|---|
| `npm run dev` | App at localhost:5180 with the map served from local data at /map/ |
| `npm run map:collect`, `map:collect:regional`, `map:verify` | Collect and check the public data locally |
| `npm run map:pack` | Pack it for hosting (into `public/map/`, git-ignored) |
| `npm run deploy` | Build and deploy to Cloudflare (pack first if the map data changed) |

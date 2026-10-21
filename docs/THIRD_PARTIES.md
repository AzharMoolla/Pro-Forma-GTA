# Third-party services

Playbook §5.3. Every external service that receives project or user data.

| Service | Purpose | Data sent | Region | User-facing disclosure | Can be disabled? | Owner |
|---|---|---|---|---|---|---|
| Supabase (project `gta-proforma`, ref `gcrhvqwexeukvsxkpvdu`, org Azr-Erzr's Org, free plan) | Auth (email + password), database (projects, append-only scenarios, tracker, receipt records), file storage (receipts) | Account email and password (hashed by Supabase Auth); project inputs, scenarios, tracker notes and amounts; uploaded receipt files | ca-central-1 (Canada Central) | Sign-in form: "Your data is stored in Supabase (Canada Central) and visible only to you." | Yes: without `.env.local` or without signing in, everything stays in the browser | Azhar Moolla |

No analytics, advertising, session replay or AI providers receive data. Fonts are bundled locally (no Google Fonts calls).

Before any public launch (playbook §4.2, §7): a Privacy Policy matching this table, a retention and deletion process for accounts and receipts (receipts are deliberately kept for the audit trail, which must be disclosed), and Terms. Not needed for local development.

# Third-party services

Playbook §5.3. Every external service that receives project or user data.

| Service | Purpose | Data sent | Region | User-facing disclosure | Can be disabled? | Owner |
|---|---|---|---|---|---|---|
| Supabase (project `gta-proforma`, ref `gcrhvqwexeukvsxkpvdu`, org Azr-Erzr's Org, free plan) | Auth (email + password), database (projects, append-only scenarios, tracker, receipt records), file storage (receipts) | Account email and password (hashed by Supabase Auth); project inputs, scenarios, tracker notes and amounts; uploaded receipt files | ca-central-1 (Canada Central) | Sign-in form: "Your data is stored in Supabase (Canada Central) and visible only to you." | Yes: without `.env.local` or without signing in, everything stays in the browser | Azhar Moolla |
| City of Toronto CKAN, Ontario LIO, Durham/Oshawa GIS and TRCA public ArcGIS services (local collection scripts only) | Download public planning/location datasets and metadata | Generic dataset IDs, page offsets and public geographic filters; request IP. No user project data or entered customer addresses | Publisher/provider infrastructure; geographic storage location not independently verified | Local collection documented in `docs/implementation/PLANNING_MAP_DATA.md` | Yes: scripts run manually; preview serves downloaded layers locally | Azhar Moolla |
| OpenStreetMap standard raster tiles (standalone local map preview only) | Optional contextual basemap | Viewed map tile coordinates, IP and browser request headers | OSMF infrastructure; see its privacy policy | Preview explains external requests beside an unchecked basemap toggle | Yes: off initially; checkbox adds/removes future tile requests | Azhar Moolla |

No analytics, advertising, session replay or AI providers receive data. Fonts are bundled locally (no Google Fonts calls).

Before any public launch (playbook §4.2, §7): a Privacy Policy matching this table, a retention and deletion process for accounts and receipts (receipts are deliberately kept for the audit trail, which must be disclosed), and Terms. Not needed for local development.

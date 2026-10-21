# Collected map data

See [the data inventory and implementation handoff](../../docs/implementation/PLANNING_MAP_DATA.md).

`manifest.json` records the actual collected files, source endpoints, publisher metadata, retrieval evidence, licences, count reconciliation, geometry types, exclusions and SHA-256 hashes. `regional-policy-sources.json` supplies primary regional policy/service links for geographic joins.

Normalized bulk data and raw response caches are generated, git-ignored local assets. Regenerate using `npm run map:collect` and `npm run map:collect:regional`; add `--refresh` directly to the collector command when refreshing an observation rather than reproducing cached responses. Run `npm run map:verify` and `npm run map:preview`.

The files are real public source data, not synthetic fixtures. Collection/structural checks do not establish legal applicability or surveyed positional accuracy. A missing map hit is not clearance.

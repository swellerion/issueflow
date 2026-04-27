
## Tech Debt
- [ ] next-auth v3 → v5 migration (Auth.js)
  - Fixes critical TypeORM SQL injection CVE (transitive dep, not directly used)
  - Breaking change: session handling, provider config, middleware all changed
  - Estimate: 1 day focused work
  - Reference: https://github.com/advisories/GHSA-fx4w-v43j-vc45

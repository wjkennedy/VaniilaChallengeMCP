---
name: Sync community members to an external system
description: >-
  Incrementally export Higher Logic Vanilla community members via API v2 -
  bulk CSV export, date-window deltas, SSO ID joins, and smart-ID lookups.
api: openapi/vanilla-api-openapi-original.json
operations: ["GET /users", "GET /users/{id}"]
note: >-
  The platform-generated OpenAPI declares operationIds on only 6 of 371
  operations, so operations are identified by method + path (all verified
  verbatim in the spec).
---

# Sync community members to an external system

1. **Authenticate** with a personal access token whose user can view members
   (email visibility requires the appropriate permission; CSV export requires
   Garden > Exports > Manage since Release 2023.017).
2. **Bulk backfill via CSV:** `GET /users.csv?page=1&limit=5000` — the `.csv`
   suffix raises the page cap to 5,000 rows (vs 500 for JSON). Walk `page`
   upward until the export returns fewer than `limit` rows.
3. **Incremental deltas:** filter by date window, e.g.
   `GET /users?dateInserted=>=2026-07-01&page=1&limit=500`, using RFC 3339
   dates with `=`, `>`, `>=`, `<`, `<=` or bracketed ranges
   `[2026-07-01,2026-07-15)`.
4. **Shape the payload** with `?fields=name,email,dateLastActive,points` and
   include SSO identifiers with `?expand=...` (see the "Expanding User SSO
   IDs" docs) so records join to your identity system.
5. **Point lookups without numeric IDs:** smart IDs resolve alternate keys —
   `GET /users/$name:<username>`, `GET /users/$email:<address>`, `$me` for the
   token's own user, and `$<authProviderKey>:<foreignID>` for SSO subjects. A
   smart ID must resolve to exactly one row or the call errors.

Rules: stay under 300 GET/min per IP; page results follow the `Link` header
(`rel="next"`), and pages can be short or empty after permission filtering.
Errors use the `BasicError` envelope (`errors/vanilla-forums-problem-types.yml`).

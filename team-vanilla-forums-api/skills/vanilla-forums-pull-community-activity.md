---
name: Pull community activity from a Vanilla community
description: >-
  Read discussions, comments, and search results from a Higher Logic Vanilla
  community via API v2, with correct auth, pagination, and field selection.
api: openapi/vanilla-api-openapi-original.json
operations: ["GET /discussions", "GET /discussions/{id}", "GET /comments", "GET /search"]
note: >-
  The platform-generated OpenAPI declares operationIds on only 6 of 371
  operations, so operations are identified by method + path (all verified
  verbatim in the spec).
---

# Pull community activity from a Vanilla community

Every Vanilla cloud community serves its own API at `https://<community-domain>/api/v2`.

1. **Authenticate.** Send a personal access token as `Authorization: Bearer <token>`
   (generated from Edit Profile > Access Tokens). Results are scoped to that
   user's role permissions. See `authentication/vanilla-forums-authentication.yml`.
2. **List discussions** with `GET /discussions`. Filter server-side:
   `?categoryID=<id>`, date windows `?dateInserted=[2026-01-01,2026-02-01)`,
   or ID ranges `?discussionID=100..` for incremental sync.
3. **Paginate** with `?page=N&limit=M`. Follow the RFC 8288 `Link` response
   header (`rel="next"` / `rel="prev"`); the `Paging-Next` header is present
   whenever more rows exist. Pages may return fewer than `limit` rows due to
   permission filtering — keep following `next` until it disappears.
4. **Trim payloads** with `?fields=name,dateInserted,insertUserID` (works on
   every GET) and inline related records with `?expand=...` where offered.
5. **Fetch detail** with `GET /discussions/{id}` and thread replies with
   `GET /comments?discussionID=<id>`.
6. **Search** across content with `GET /search?query=<terms>`.

Rules: stay under 300 GET requests/min per IP (HTTP 429 for 1 minute if
exceeded; >250 requests in 10s risks a hard block — see
`rate-limits/vanilla-forums-rate-limits.yml`). Errors return
`{"message", "status", "description"}` (`errors/vanilla-forums-problem-types.yml`).
There is no idempotency-key mechanism; GETs are safe to retry, writes are not.

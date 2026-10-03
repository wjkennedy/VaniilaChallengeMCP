---
name: Post a discussion and reply with a comment
description: >-
  Create content in a Higher Logic Vanilla community via API v2 - start a
  discussion in a category, then reply to it with a comment - with correct
  auth, error handling, and rate-limit discipline.
api: openapi/vanilla-api-openapi-original.json
operations: ["GET /categories", "POST /discussions", "POST /comments", "GET /comments"]
note: >-
  The platform-generated OpenAPI declares operationIds on only 6 of 371
  operations, so operations are identified by method + path (all verified
  verbatim in the spec).
---

# Post a discussion and reply with a comment

1. **Authenticate** with `Authorization: Bearer <personal access token>`. The
   post is attributed to the token's user and requires that user's role to
   have posting permission in the target category.
2. **Pick the category.** `GET /categories` lists categories; smart IDs let
   you address one by URL code without knowing its numeric ID:
   `/categories/$urlcode:<code>`.
3. **Create the discussion** with `POST /discussions` (JSON body with the
   discussion name, body, format, and `categoryID`). A `201`-family response
   returns the created record including `discussionID`.
4. **Reply** with `POST /comments`, passing the new `discussionID` in the body.
5. **Verify the thread** with `GET /comments?discussionID=<id>`.

Rules: writes are limited to 120 requests/min per IP (HTTP 429, 1-minute
block). There is NO idempotency-key support — a retried `POST /discussions`
after a timeout can double-post, so on ambiguous failure list recent
discussions (`?insertUserID=$me&dateInserted=>=<start>`) before retrying.
Validation failures return `400` with the `BasicError` envelope
(`{"message", "status", "description"}`); `403` means the role lacks
permission in that category.

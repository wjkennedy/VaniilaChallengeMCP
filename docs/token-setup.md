# Vanilla API authentication and token setup

## Current project decision

We are not depending on PAT or JWT credentials for the first challenge implementation. The MCP server can run in public-read mode, using unauthenticated GET requests for content, comments, users, leaderboards, and other data that the community exposes publicly. Browser automation will handle actions that require a signed-in user, including posting, sharing, RSVP, reactions, and group participation.

This means the JWT signing-secret path is documented for completeness but is not part of the implementation plan.

When available, the MCP server can use a Higher Logic Vanilla Personal Access Token in the `Authorization: Bearer ...` header. It is optional for the public-read challenge workflows.

## What we verified on Atlassian Community

As of 2026-10-03, the signed-in Atlassian Community implementation does **not** expose the documented Vanilla token UI:

- the profile menu contains Profile, Settings, Switch accounts, and Log out;
- the profile page contains profile editing, badges, groups, and events; and
- there is no **Access Tokens** page or **Generate New Token** control.

Therefore the generic Vanilla instructions below should not be treated as a valid navigation path for this tenant. This is consistent with the site either not enabling personal API tokens, not granting the token permission to community-user roles, or overriding the standard Vanilla profile surface.

## Generic Vanilla UI path (other Vanilla tenants)

1. Sign in to the Atlassian Community site.
2. Open the profile menu (the MeBox/avatar).
3. Choose **Edit Profile**.
4. In the profile page's right-hand navigation, choose **Access Tokens**.
5. Choose **Generate New Token**.
6. Give it a descriptive name, such as `Atlassian Community Challenges MCP`.
7. Generate the token and use **Reveal** to copy the complete value.

The current documentation describes the direct profile route as `/profile/tokens`, but the profile menu is the safer way to reach it because the community's base URL and routing can vary.

## Recommended request to Atlassian/Higher Logic

Ask the Atlassian Community owner or Higher Logic support to confirm all of the following:

1. Is API v2 enabled for the Atlassian Community tenant?
2. Is the Personal Access Tokens feature enabled?
3. Can they create a dedicated non-personal integration user for the challenge automation?
4. Can they grant that user only the required API permissions and issue a token, or enable the profile token UI for its role?
5. What is the tenant-specific API base URL? For this site it appears to be under `/forums`, not the site root.

Suggested wording:

> We are building a server-side integration for Atlassian Community challenge verification. The signed-in community profile does not expose Vanilla’s Access Tokens page. Can you confirm whether API v2 and Personal Access Tokens are enabled for this tenant? If so, please provision a dedicated least-privilege integration user and token, or enable the token permission/UI for that user. Please also confirm the tenant-specific API v2 base URL and allowed endpoints.

## If “Access Tokens” is missing

The account's assigned role needs the permission to add API tokens. In the Dashboard, an administrator should inspect:

`Settings → Membership → Roles & Permissions → [the relevant role] → Garden → Curation → Add`

Some Vanilla documentation labels the same permission as `Garden > Tokens > Add`. After the permission is enabled, sign out/in or refresh the profile page and check for **Access Tokens** again.

The token inherits the permissions of the user who created it. For this project, use a dedicated integration user with only the read and narrowly scoped write permissions required by the challenge workflows. Do not use a personal administrator token unless this is a temporary diagnostic step.

## API-level token endpoints

The API reference also exposes these endpoints for an already authenticated user:

- `POST /api/v2/tokens` — issue a token for the current user
- `GET /api/v2/tokens` — list token IDs for the current user
- `GET /api/v2/tokens/{id}` — reveal a token, requiring a valid transient/CSRF key
- `DELETE /api/v2/tokens/{id}` — revoke a token

These endpoints do not remove the need for an authenticated user with token-creation permission, so they are not a workaround when the UI option is unavailable.

## Other possible authentication routes

### OAuth token exchange

Vanilla supports `POST /api/v2/tokens/oauth`, but only when the tenant has a configured OAuth/OIDC connection with **Allow this connection to issue API access tokens** enabled. The flow requires:

- a configured OAuth client ID;
- an OAuth provider access token with permission to read the user's profile; and
- exchange of that provider token for a short-lived Vanilla token.

This is an admin-level tenant configuration, not something an ordinary Atlassian Community user can activate. The resulting Vanilla token expires and must be refreshed.

### JWT authentication

Vanilla also documents JWT API authentication, but the JWT addon and signing secret must be enabled and provided by the tenant administrator. It is not a self-service replacement for a missing PAT.

The JWT must use HS256 and include `iss`, `sub`, `aud`, `email`, `displayname`, and `exp`, plus `iat` or `nbf`. The audience should be the community URL. The secret must stay server-side.

This repository includes a generator and local verifier:

```sh
VANILLA_BASE_URL=https://community.atlassian.com/forums \
VANILLA_JWT_SECRET='provided-by-higher-logic' \
JWT_ISSUER='https://your-identity-provider.example' \
JWT_SUB='stable-integration-user-id' \
JWT_EMAIL='integration-user@example.com' \
JWT_DISPLAYNAME='Community Challenges Integration' \
npm run jwt:self-test
```

To create a JWT for the MCP server, run the same command without `npm run jwt:self-test`; the script prints only the token to stdout. Set that output as `VANILLA_API_TOKEN`. To test it against the live API, use `--api-test` instead. That live test will only succeed if the tenant's JWT addon is enabled, the claims identify a valid community user, the audience matches the tenant configuration, and the secret is correct.

### Vanilla MCP

If Atlassian Community has the Higher Logic Vanilla MCP beta enabled, that may provide an approved AI connector without exposing a PAT. It is a separate remote connector, however, and does not give this custom Node.js server a general REST credential. It is worth asking support whether this tenant is enrolled.

### Browser session automation

The existing signed-in browser session can perform UI actions that the public API cannot, but browser cookies are not a safe or durable credential for a server-side Node process. We can use browser automation as a separate execution worker for actions such as RSVP, sharing, and reactions, while API-backed verification remains pending.

## Configure the MCP server

Keep the token server-side and provide it through the process environment:

```sh
VANILLA_BASE_URL=https://community.atlassian.com/forums \
VANILLA_API_TOKEN='' \
ALLOW_MUTATIONS=false \
npm start
```

The MCP server only sends the `Authorization` header when `VANILLA_API_TOKEN` is set. It does not put the token in URLs, browser code, or MCP tool arguments.

Verify the token with the `vanilla_get_current_user` MCP tool or:

```sh
curl -sS \
  -H "Authorization: Bearer $VANILLA_API_TOKEN" \
  -H "Accept: application/json" \
  "$VANILLA_BASE_URL/api/v2/users/me"
```

If the token is exposed or no longer needed, revoke it from the Access Tokens page. API calls made with the token immediately stop working after revocation.

## References

- [Authenticating API v2 calls with Personal Access Tokens](https://success.vanillaforums.com/kb/articles/41-authenticating-api-v2-calls-with-personal-access-tokens)
- [Make API calls with the API Docs page](https://success.vanillaforums.com/kb/articles/1968-make-api-calls-with-the-api-docs-page)
- [Roles & Permissions](https://success.vanillaforums.com/kb/articles/39)
- [OAuth 2.0 token exchange](https://success.vanillaforums.com/kb/articles/33-oauth-2-0)
- [JWT API authentication](https://success.vanillaforums.com/kb/articles/122-authenticating-api-v2-calls-with-jwt)
- [Vanilla MCP](https://success.vanillaforums.com/kb/articles/1955-model-context-protocol-mcp-in-vanilla)
- [Local token API reference](../team-vanilla-forums-api/openapi/vanilla-forums-tokens-api-openapi.yml)

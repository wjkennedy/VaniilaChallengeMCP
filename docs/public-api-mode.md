# Public API mode

The first challenge implementation does not depend on a Vanilla Personal Access Token or JWT signing secret.

## What works without credentials

The MCP server can issue unauthenticated GET requests for publicly visible data, subject to the tenant's visibility rules:

- search and list discussions;
- retrieve discussions and comments;
- find unanswered questions;
- inspect public users and group membership data where exposed;
- read contributor rankings and leaderboards; and
- load the local challenge catalog.

The server only sends an `Authorization` header when `VANILLA_API_TOKEN` is set. The Atlassian Community forum base URL is configured as:

```text
https://community.atlassian.com/forums
```

The client appends `/api/v2/...`, preserving the `/forums` path.

## What requires browser automation

These challenge actions are not assumed to be available through the public API:

- posting a discussion or answer;
- sharing content;
- liking/reacting to content;
- RSVP or event attendance actions;
- joining or participating in groups; and
- claiming or completing UI-based challenge actions.

Browser automation should perform these actions in the user’s authenticated session. The API layer should be used afterward to verify observable evidence and produce a dry-run challenge report. Browser cookies must not be copied into the Node.js server as a credential.

## What remains optional

If Atlassian/Higher Logic later provisions an integration credential, the same client can send it as a bearer token. Authenticated identity checks and write tools remain disabled or permission-dependent; public challenge discovery does not wait on them.

## Verification commands

```sh
npm run check
npm test
```

The tests use a fake fetch implementation, so they verify URL construction, authentication-header behavior, error handling, and challenge configuration without contacting the live community or changing external state.

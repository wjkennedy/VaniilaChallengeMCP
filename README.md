# Atlassian Community Challenges MCP

A small Node.js MCP server that exposes challenge-oriented tools over the Higher Logic Vanilla API used by Atlassian Community.

## Configuration

```sh
cp .env.example .env
```

Set `VANILLA_BASE_URL` to the Vanilla forum base URL (for Atlassian Community this is currently `https://community.atlassian.com/forums`). `VANILLA_API_TOKEN` is optional: public GET tools can run without it. The token is only needed for authenticated identity or write operations. `ALLOW_MUTATIONS` is `false` by default.

If **Access Tokens** is not visible in the profile, it is likely disabled for the tenant. See [docs/token-setup.md](docs/token-setup.md) for the verified Atlassian Community state, escalation request, alternatives, and verification command.

The API profile in `team-vanilla-forums-api/` is useful for validating endpoint and payload details, but the community's Dashboard API reference remains authoritative because endpoints and fields vary by enabled addons and configuration.

## Run

```sh
npm install
VANILLA_BASE_URL=https://community.atlassian.com/forums \
VANILLA_API_TOKEN='' \
npm start
```

This is a stdio MCP server, so configure it in an MCP-capable client with a command equivalent to:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/AtlassianCommunity/src/index.js"],
  "env": {
    "VANILLA_BASE_URL": "https://community.atlassian.com/forums",
    "VANILLA_API_TOKEN": "",
    "ALLOW_MUTATIONS": "false"
  }
}
```

## Current scope

The initial catalog in `challenges.json` comes from `challenges.html`. Each challenge records its points, cadence, repeatability, automation mode (`api`, `browser`, or `hybrid`), and verification signals. The server currently supports public discovery and verification primitives: unanswered questions, discussion search/detail, comments, contributor rankings, period-aware leaderboards, group membership, and user lookup.

Browser-required actions are intentionally represented as verification requirements rather than faked as API operations. Browser automation is the path for RSVP, sharing, reactions, group joins, posting, and other UI-only actions; the public API can then gather evidence and produce a dry-run challenge report. Authenticated API writes remain optional capabilities rather than a dependency.

See [docs/public-api-mode.md](docs/public-api-mode.md) for the capability boundary and testing approach.

## Test

```sh
npm run check
npm test
```
# VaniilaChallengeMCP

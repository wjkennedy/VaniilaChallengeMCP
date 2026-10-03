import test from "node:test";
import assert from "node:assert/strict";
import { VanillaApiError, VanillaClient } from "../src/vanilla-client.js";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("public mode preserves the /forums API base and sends no bearer token", async () => {
  let seen;
  const client = new VanillaClient({
    baseUrl: "https://community.atlassian.com/forums",
    fetchImpl: async (url, init) => {
      seen = { url: String(url), headers: init.headers };
      return response([]);
    }
  });

  await client.listDiscussions({ status: "unanswered", limit: 10 });

  assert.equal(seen.url, "https://community.atlassian.com/forums/api/v2/discussions?status=unanswered&limit=10");
  assert.equal(seen.headers.Authorization, undefined);
});

test("authenticated mode sends the bearer token", async () => {
  let seenHeaders;
  const client = new VanillaClient({
    baseUrl: "https://community.atlassian.com/forums/",
    token: "test-token",
    fetchImpl: async (_url, init) => {
      seenHeaders = init.headers;
      return response({ ok: true });
    }
  });

  await client.me();

  assert.equal(seenHeaders.Authorization, "Bearer test-token");
});

test("array query parameters are repeated and empty values are omitted", async () => {
  let seenUrl;
  const client = new VanillaClient({
    baseUrl: "https://community.atlassian.com/forums",
    fetchImpl: async (url) => {
      seenUrl = String(url);
      return response([]);
    }
  });

  await client.listComments({ discussionID: 42, expand: ["insertUser", "reactions"], qna: "", page: undefined });

  assert.equal(seenUrl, "https://community.atlassian.com/forums/api/v2/comments?discussionID=42&expand=insertUser&expand=reactions");
});

test("non-success responses become VanillaApiError", async () => {
  const client = new VanillaClient({
    baseUrl: "https://community.atlassian.com/forums",
    fetchImpl: async () => response({ message: "forbidden" }, 403)
  });

  await assert.rejects(() => client.me(), (error) => {
    assert.ok(error instanceof VanillaApiError);
    assert.equal(error.status, 403);
    assert.deepEqual(error.body, { message: "forbidden" });
    return true;
  });
});

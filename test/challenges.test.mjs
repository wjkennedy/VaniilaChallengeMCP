import test from "node:test";
import assert from "node:assert/strict";
import { loadChallenges } from "../src/challenges.js";

test("challenge catalog contains the initial HTML challenge set", async () => {
  const challenges = await loadChallenges();
  assert.equal(challenges.length, 15);
  assert.equal(new Set(challenges.map((challenge) => challenge.id)).size, 15);
  assert.ok(challenges.every((challenge) => challenge.points > 0));
  assert.ok(challenges.every((challenge) => ["api", "browser", "hybrid"].includes(challenge.mode)));
  assert.ok(challenges.some((challenge) => challenge.id === "helping-hands"));
  assert.ok(challenges.some((challenge) => challenge.id === "save-me-a-seat"));
});

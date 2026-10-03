import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { VanillaClient } from "./vanilla-client.js";
import { challengeSummary, loadChallenges } from "./challenges.js";

const client = new VanillaClient({
  baseUrl: process.env.VANILLA_BASE_URL,
  token: process.env.VANILLA_API_TOKEN
});
const allowMutations = process.env.ALLOW_MUTATIONS === "true";

const server = new McpServer({
  name: "atlassian-community-challenges",
  version: "0.1.0"
});

function result(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error) {
  return {
    isError: true,
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }]
  };
}

async function safely(fn) {
  try { return result(await fn()); }
  catch (error) { return errorResult(error); }
}

server.registerTool("challenge_list_definitions", {
  description: "List locally configured Atlassian Community challenge definitions. The initial config is intentionally empty until the challenge notes are converted into rules.",
  inputSchema: {}
}, async () => safely(async () => challengeSummary(await loadChallenges())));

server.registerTool("vanilla_get_current_user", {
  description: "Verify the Vanilla API token and return the identity and permissions of its owner.",
  inputSchema: {}
}, async () => safely(() => client.me()));

server.registerTool("challenge_find_unanswered_questions", {
  description: "Find unanswered community questions, useful for questions-based challenge eligibility and follow-up automation.",
  inputSchema: {
    categoryID: z.number().int().optional().describe("Limit results to a Vanilla category ID."),
    dateInserted: z.string().optional().describe("Vanilla date filter, for example >2026-01-01."),
    page: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100).optional()
  }
}, async ({ categoryID, dateInserted, page, limit }) => safely(() => client.listDiscussions({
  status: "unanswered", categoryID, dateInserted, page, limit,
  expand: ["insertUser", "category"]
})));

server.registerTool("challenge_search_discussions", {
  description: "Search Vanilla discussions by text, optionally scoped to a category.",
  inputSchema: {
    query: z.string().min(1),
    categoryID: z.number().int().optional(),
    page: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100).optional()
  }
}, async ({ query, categoryID, page, limit }) => safely(() => client.searchDiscussions({ query, categoryID, page, limit, expand: true })));

server.registerTool("challenge_get_discussion", {
  description: "Retrieve a discussion and its expanded challenge-relevant metadata.",
  inputSchema: { discussionID: z.number().int().positive() }
}, async ({ discussionID }) => safely(() => client.getDiscussion(discussionID, {
  expand: ["insertUser", "category", "tags", "status", "status.log", "reactions"]
})));

server.registerTool("challenge_list_discussion_comments", {
  description: "List comments for a discussion, including author and answer/reaction metadata where available.",
  inputSchema: {
    discussionID: z.number().int().positive(),
    qna: z.enum(["accepted", "rejected"]).optional(),
    page: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100).optional()
  }
}, async ({ discussionID, qna, page, limit }) => safely(() => client.listComments({
  discussionID, qna, page, limit,
  expand: ["insertUser", "reactions"]
})));

server.registerTool("challenge_rank_contributors", {
  description: "Return community users ranked by points or post count for leaderboard-style challenges.",
  inputSchema: {
    sort: z.enum(["-points", "-countPosts", "points", "countPosts"]).default("-points"),
    page: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(500).default(50),
    dateInserted: z.string().optional(),
    dateLastActive: z.string().optional()
  }
}, async ({ sort, page, limit, dateInserted, dateLastActive }) => safely(() => client.listUsers({
  sort, page, limit, dateInserted, dateLastActive,
  isBanned: false,
  expand: ["profileFields", "roles"]
})));

server.registerTool("challenge_get_leaderboard", {
  description: "Get Vanilla's period-aware leaderboard for reputation, posts, or accepted answers.",
  inputSchema: {
    leaderboardType: z.enum(["reputation", "posts", "acceptedAnswers"]).default("reputation"),
    slotType: z.enum(["d", "w", "m", "y", "a"]).default("a"),
    categoryID: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(500).default(50)
  }
}, async ({ leaderboardType, slotType, categoryID, limit }) => safely(() => client.leaders({
  leaderboardType, slotType, categoryID, limit
})));

server.registerTool("challenge_find_group_members", {
  description: "Find users by Vanilla group membership, useful for group-based challenge verification.",
  inputSchema: {
    groupID: z.number().int().positive(),
    membershipStatus: z.enum(["member", "leader", "pending", "invited", "banned"]).default("member"),
    page: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(500).default(100)
  }
}, async ({ groupID, membershipStatus, page, limit }) => safely(() => client.listUsers({
  groupID, membershipStatus, page, limit,
  isBanned: false,
  expand: ["profileFields", "roles"]
})));

server.registerTool("challenge_find_user_answers", {
  description: "Find comments authored by a user, optionally limited to accepted answers and a date window.",
  inputSchema: {
    userID: z.number().int().positive(),
    qna: z.enum(["accepted", "rejected"]).optional(),
    dateInserted: z.string().optional().describe("Vanilla date filter, for example >2026-01-01."),
    page: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100).default(100)
  }
}, async ({ userID, qna, dateInserted, page, limit }) => safely(() => client.listComments({
  insertUserID: userID, qna, dateInserted, page, limit,
  expand: ["insertUser", "reactions"]
})));

server.registerTool("challenge_get_user", {
  description: "Retrieve one community user for challenge verification.",
  inputSchema: { userID: z.number().int().positive() }
}, async ({ userID }) => safely(() => client.getUser(userID, { expand: ["profileFields", "roles"] })));

server.registerTool("challenge_tag_discussion", {
  description: "Apply a set of tags to a discussion. Disabled unless ALLOW_MUTATIONS=true.",
  inputSchema: {
    discussionID: z.number().int().positive(),
    tagIDs: z.array(z.number().int().positive()).min(1)
  }
}, async ({ discussionID, tagIDs }) => safely(async () => {
  if (!allowMutations) throw new Error("Mutations are disabled. Set ALLOW_MUTATIONS=true after validating the challenge workflow.");
  return client.updateDiscussionTags(discussionID, tagIDs);
}));

server.registerTool("challenge_set_discussion_status", {
  description: "Change a discussion status. Disabled unless ALLOW_MUTATIONS=true.",
  inputSchema: {
    discussionID: z.number().int().positive(),
    statusID: z.number().int().positive(),
    statusNotes: z.string().max(2000).optional()
  }
}, async ({ discussionID, statusID, statusNotes }) => safely(async () => {
  if (!allowMutations) throw new Error("Mutations are disabled. Set ALLOW_MUTATIONS=true after validating the challenge workflow.");
  return client.updateDiscussionStatus(discussionID, { statusID, statusNotes });
}));

const transport = new StdioServerTransport();
await server.connect(transport);

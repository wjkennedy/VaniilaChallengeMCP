export class VanillaApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "VanillaApiError";
    this.status = status;
    this.body = body;
  }
}

export class VanillaClient {
  constructor({ baseUrl, token, fetchImpl = fetch } = {}) {
    if (!baseUrl) throw new Error("VANILLA_BASE_URL is required");
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token || null;
    this.fetchImpl = fetchImpl;
  }

  async request(path, { method = "GET", query, body } = {}) {
    const url = new URL(`api/v2/${path.replace(/^\//, "")}`, `${this.baseUrl}/`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, String(item)));
      else url.searchParams.set(key, String(value));
    }

    const response = await this.fetchImpl(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });

    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
      const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
      throw new VanillaApiError(`Vanilla API ${response.status}: ${detail}`, {
        status: response.status,
        body: payload
      });
    }
    return payload;
  }

  me() { return this.request("/users/me"); }
  searchDiscussions(query) { return this.request("/discussions/search", { query }); }
  listDiscussions(query) { return this.request("/discussions", { query }); }
  getDiscussion(id, query) { return this.request(`/discussions/${id}`, { query }); }
  listComments(query) { return this.request("/comments", { query }); }
  listUsers(query) { return this.request("/users", { query }); }
  leaders(query) { return this.request("/users/leaders", { query }); }
  getUser(id, query) { return this.request(`/users/${id}`, { query }); }

  updateDiscussionTags(id, tagIDs) {
    return this.request(`/discussions/${id}/tags`, { method: "PUT", body: { tagIDs } });
  }

  updateDiscussionStatus(id, { statusID, statusNotes }) {
    return this.request(`/discussions/${id}/status`, {
      method: "PUT",
      body: { statusID, statusNotes }
    });
  }
}

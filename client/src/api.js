const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("vanguard_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  content: () => request("/content", { auth: false }),

  signup: (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  dashboard: () => request("/users/dashboard"),
  organization: () => request("/users/organization"),
  leaderboard: () => request("/users/leaderboard"),
  redeem: (code) => request("/users/redeem", { method: "POST", body: { code } }),
  changePassword: (payload) => request("/users/profile/password", { method: "POST", body: payload }),
  setHandle: (handle) => request("/users/profile/handle", { method: "POST", body: { handle } }),

  admin: {
    stats: () => request("/admin/stats"),
    content: () => request("/admin/content"),
    updateContent: (payload) => request("/admin/content", { method: "PUT", body: payload }),
    settings: () => request("/admin/settings"),
    updateSettings: (payload) => request("/admin/settings", { method: "PUT", body: payload }),
    ranks: () => request("/admin/ranks"),
    updateRank: (id, payload) => request(`/admin/ranks/${id}`, { method: "PUT", body: payload }),
    createRank: (payload) => request("/admin/ranks", { method: "POST", body: payload }),
    deleteRank: (id) => request(`/admin/ranks/${id}`, { method: "DELETE" }),
    users: (q) => request(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    userDetail: (id) => request(`/admin/users/${id}`),
    adjustPoints: (id, payload) => request(`/admin/users/${id}/adjust`, { method: "POST", body: payload }),
    setStatus: (id, status) => request(`/admin/users/${id}/status`, { method: "POST", body: { status } }),
    setRole: (id, role) => request(`/admin/users/${id}/role`, { method: "POST", body: { role } }),
    codes: () => request("/admin/codes"),
    createCode: (payload) => request("/admin/codes", { method: "POST", body: payload }),
    toggleCode: (id) => request(`/admin/codes/${id}/toggle`, { method: "POST" }),
  },
};

export { getToken };

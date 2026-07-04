import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useContent } from "../../context/ContentContext";
import "../../styles/app.css";

function sectionOf(key) {
  const parts = key.split(".");
  return parts.length > 1 ? parts[0] : "general";
}

const SECTION_LABELS = {
  brand: "Brand",
  nav: "Navigation",
  auth: "Sign in / Sign up",
  dashboard: "Dashboard",
  organization: "Organization",
  leaderboard: "Leaderboard",
  redeem: "Redeem code",
  profile: "Profile",
  admin: "Prospera HQ",
  general: "General",
};

export default function AdminContent() {
  const { t, refresh: refreshGlobalContent } = useContent();
  const [rows, setRows] = useState([]);
  const [edits, setEdits] = useState({});
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api.admin.content().then((d) => setRows(d.content)).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (!q) return true;
      const currentValue = edits[r.key] ?? r.value;
      return r.key.toLowerCase().includes(q) || currentValue.toLowerCase().includes(q);
    });
    const groups = {};
    for (const r of filtered) {
      const section = sectionOf(r.key);
      if (!groups[section]) groups[section] = [];
      groups[section].push(r);
    }
    return groups;
  }, [rows, query, edits]);

  function handleChange(key, value) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAll() {
    if (Object.keys(edits).length === 0) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await api.admin.updateContent(edits);
      setSuccess(t("admin.content.saved_message", "Site text updated."));
      setEdits({});
      load();
      refreshGlobalContent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const dirtyCount = Object.keys(edits).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("admin.content.eyebrow", "Prospera HQ")}</div>
          <h1 className="display page-title">{t("admin.content.title", "Site text")}</h1>
        </div>
        <button className="primary" onClick={saveAll} disabled={busy || dirtyCount === 0}>
          {busy
            ? t("admin.content.save_button_loading", "Saving…")
            : `${t("admin.content.save_button", "Save changes")}${dirtyCount ? ` (${dirtyCount})` : ""}`}
        </button>
      </div>

      <p className="muted" style={{ fontSize: 13.5, marginBottom: 18, maxWidth: 640 }}>
        {t("admin.content.body", "Edit any word or phrase shown across the platform. Changes appear immediately for everyone.")}
      </p>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <input
          placeholder={t("admin.content.search_placeholder", "Search text…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {Object.entries(grouped).map(([section, items]) => (
        <div className="card" key={section} style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{SECTION_LABELS[section] || section}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {items.map((r) => (
              <div key={r.key} className="field" style={{ marginBottom: 0 }}>
                <label htmlFor={r.key} className="mono" style={{ fontSize: 11 }}>{r.key}</label>
                <textarea
                  id={r.key}
                  rows={r.value.length > 90 || r.value.includes("\n") ? 3 : 1}
                  value={edits[r.key] ?? r.value}
                  onChange={(e) => handleChange(r.key, e.target.value)}
                  style={{ resize: "vertical", fontFamily: "var(--font-body)", fontSize: 13.5 }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {rows.length > 0 && Object.keys(grouped).length === 0 && (
        <div className="card"><div className="empty-state">No text matches your search.</div></div>
      )}
    </div>
  );
}

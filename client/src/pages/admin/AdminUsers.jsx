import { useEffect, useState } from "react";
import { api } from "../../api";
import { useContent } from "../../context/ContentContext";
import "../../styles/app.css";

export default function AdminUsers() {
  const { t } = useContent();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [busy, setBusy] = useState(false);

  function loadUsers(query) {
    api.admin.users(query).then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  }

  useEffect(() => { loadUsers(""); }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    api.admin.userDetail(selectedId).then(setDetail).catch((e) => setError(e.message));
  }, [selectedId]);

  function handleSearch(e) {
    e.preventDefault();
    loadUsers(q);
  }

  async function refreshDetail() {
    const d = await api.admin.userDetail(selectedId);
    setDetail(d);
    loadUsers(q);
  }

  async function submitAdjust(e) {
    e.preventDefault();
    const points = parseInt(adjustPoints, 10);
    if (!points) return;
    setBusy(true);
    try {
      await api.admin.adjustPoints(selectedId, { points, note: adjustNote || undefined });
      setAdjustPoints("");
      setAdjustNote("");
      await refreshDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    setBusy(true);
    try {
      const next = detail.user.status === "active" ? "suspended" : "active";
      await api.admin.setStatus(selectedId, next);
      await refreshDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleRole() {
    setBusy(true);
    try {
      const next = detail.user.role === "admin" ? "user" : "admin";
      await api.admin.setRole(selectedId, next);
      await refreshDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("admin.users.eyebrow", "Prospera HQ")}</div>
          <h1 className="display page-title">{t("admin.users.title", "Prosperians")}</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="two-col">
        <div className="card">
          <form onSubmit={handleSearch} className="copy-row" style={{ marginBottom: 16 }}>
            <input placeholder={t("admin.users.search_placeholder", "Search name, email, or address…")} value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit">{t("admin.users.search_button", "Search")}</button>
          </form>
          <table>
            <thead><tr><th>Name</th><th>Points</th><th>Status</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  style={{ cursor: "pointer", background: selectedId === u.id ? "rgba(179,130,42,0.08)" : undefined }}
                >
                  <td>
                    {u.name}
                    {u.role === "admin" && <span className="pill pill-brass" style={{ marginLeft: 6 }}>HQ</span>}
                    <div className="faint" style={{ fontSize: 11.5 }}>{u.email}</div>
                  </td>
                  <td className="mono">{u.points.toLocaleString()}</td>
                  <td>
                    <span className={"pill " + (u.status === "active" ? "pill-teal" : "pill-red")}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={3} className="empty-state">{t("admin.users.empty", "No matching Prosperians.")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          {!detail ? (
            <div className="empty-state">{t("admin.users.detail_empty", "Select a Prosperian to view their file.")}</div>
          ) : (
            <div>
              <h3 style={{ fontSize: 16 }}>{detail.user.name}</h3>
              <div className="faint mono" style={{ fontSize: 12, marginBottom: 4 }}>{detail.user.email}</div>
              <div className="faint mono" style={{ fontSize: 12, marginBottom: 14 }}>
                Referral code: {detail.user.referral_code}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                <span className="pill pill-brass">{detail.user.points.toLocaleString()} pts</span>
                <span className={"pill " + (detail.user.status === "active" ? "pill-teal" : "pill-red")}>
                  {detail.user.status}
                </span>
                <span className="pill pill-muted">{detail.user.role}</span>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                <button className={detail.user.status === "active" ? "danger" : ""} onClick={toggleStatus} disabled={busy}>
                  {detail.user.status === "active" ? t("admin.users.suspend_button", "Suspend account") : t("admin.users.reactivate_button", "Reactivate account")}
                </button>
                <button className="ghost" onClick={toggleRole} disabled={busy}>
                  {detail.user.role === "admin" ? t("admin.users.revoke_hq_button", "Revoke HQ access") : t("admin.users.grant_hq_button", "Grant HQ access")}
                </button>
              </div>

              <hr className="hairline-divider" />

              <h4 style={{ fontSize: 13.5, marginBottom: 10 }}>{t("admin.users.adjust_title", "Adjust points")}</h4>
              <form onSubmit={submitAdjust} className="form-grid" style={{ marginBottom: 18 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="adjPoints">{t("admin.users.adjust_amount_label", "Amount (use - to deduct)")}</label>
                  <input id="adjPoints" className="mono" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} placeholder="e.g. 250 or -100" />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="adjNote">{t("admin.users.adjust_note_label", "Note")}</label>
                  <input id="adjNote" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason (optional)" />
                </div>
                <button className="primary" type="submit" disabled={busy} style={{ gridColumn: "1 / -1" }}>
                  {t("admin.users.adjust_button", "Apply adjustment")}
                </button>
              </form>

              <h4 style={{ fontSize: 13.5, marginBottom: 10 }}>{t("admin.users.history_title", "Transaction history")}</h4>
              <table>
                <thead><tr><th>Type</th><th>Points</th></tr></thead>
                <tbody>
                  {detail.transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{t.type}{t.note && <div className="faint" style={{ fontSize: 11 }}>{t.note}</div>}</td>
                      <td className={t.points >= 0 ? "pts-positive" : "pts-negative"}>{t.points >= 0 ? "+" : ""}{t.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

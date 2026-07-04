import { useEffect, useState } from "react";
import { api } from "../../api";
import { useContent } from "../../context/ContentContext";
import "../../styles/app.css";

export default function AdminCodes() {
  const { t } = useContent();
  const [codes, setCodes] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [points, setPoints] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [customCode, setCustomCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api.admin.codes().then((d) => setCodes(d.codes)).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await api.admin.createCode({
        points: parseInt(points, 10),
        maxUses: parseInt(maxUses, 10) || 1,
        customCode: customCode || undefined,
        note: note || undefined,
      });
      setSuccess(`Code created: ${res.code}`);
      setPoints("");
      setMaxUses("1");
      setCustomCode("");
      setNote("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id) {
    await api.admin.toggleCode(id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("admin.codes.eyebrow", "Prospera HQ")}</div>
          <h1 className="display page-title">{t("admin.codes.title", "Boost codes")}</h1>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>{t("admin.codes.issue_title", "Issue a new boost code")}</h3>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
            {t("admin.codes.issue_body", "Prosperians redeem this code from their dashboard to receive bonus points.")}
          </p>
          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="points">{t("admin.codes.points_label", "Points value")}</label>
                <input id="points" className="mono" value={points} onChange={(e) => setPoints(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="maxUses">{t("admin.codes.max_uses_label", "Max redemptions")}</label>
                <input id="maxUses" className="mono" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="customCode">{t("admin.codes.custom_code_label", "Custom code (optional — auto-generated if blank)")}</label>
              <input id="customCode" className="mono" value={customCode} onChange={(e) => setCustomCode(e.target.value.toUpperCase())} />
            </div>
            <div className="field">
              <label htmlFor="note">{t("admin.codes.note_label", "Internal note (optional)")}</label>
              <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Q3 leadership summit" />
            </div>
            <button className="primary" type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? t("admin.codes.create_button_loading", "Creating…") : t("admin.codes.create_button", "Create code")}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{t("admin.codes.list_title", "All codes")}</h3>
          <table>
            <thead><tr><th>Code</th><th>Points</th><th>Uses</th><th>Status</th></tr></thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.code}{c.note && <div className="faint" style={{ fontSize: 11 }}>{c.note}</div>}</td>
                  <td className="mono">{c.points}</td>
                  <td className="faint">{c.uses_count}/{c.max_uses}</td>
                  <td>
                    <button
                      className={c.active ? "ghost" : ""}
                      style={{ padding: "5px 10px", fontSize: 12 }}
                      onClick={() => toggle(c.id)}
                    >
                      {c.active ? t("admin.codes.deactivate", "Active — deactivate") : t("admin.codes.activate", "Inactive — activate")}
                    </button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr><td colSpan={4} className="empty-state">{t("admin.codes.empty", "No codes issued yet.")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

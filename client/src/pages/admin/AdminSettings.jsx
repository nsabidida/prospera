import { useEffect, useState } from "react";
import { api } from "../../api";
import { useContent } from "../../context/ContentContext";
import "../../styles/app.css";

export default function AdminSettings() {
  const { t } = useContent();
  const [settings, setSettings] = useState(null);
  const [ranks, setRanks] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [newRankName, setNewRankName] = useState("");
  const [newRankPoints, setNewRankPoints] = useState("");

  function load() {
    api.admin.settings().then((d) => setSettings(d.settings)).catch((e) => setError(e.message));
    api.admin.ranks().then((d) => setRanks(d.ranks)).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function saveSettings(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    setBusy(true);
    try {
      await api.admin.updateSettings(settings);
      setSuccess("Point rules updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveRank(rank) {
    await api.admin.updateRank(rank.id, { name: rank.name, min_points: rank.min_points });
    load();
  }

  async function addRank(e) {
    e.preventDefault();
    if (!newRankName || newRankPoints === "") return;
    await api.admin.createRank({ name: newRankName, min_points: parseInt(newRankPoints, 10) });
    setNewRankName("");
    setNewRankPoints("");
    load();
  }

  async function removeRank(id) {
    await api.admin.deleteRank(id);
    load();
  }

  if (!settings) return <div className="muted">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("admin.settings.eyebrow", "Prospera HQ")}</div>
          <h1 className="display page-title">{t("admin.settings.title", "Point rules & ranks")}</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="two-col">
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>{t("admin.settings.rules_title", "Point rules")}</h3>
          <form onSubmit={saveSettings}>
            <div className="field">
              <label htmlFor="signup_points">{t("admin.settings.signup_points_label", "Points per sign-up")}</label>
              <input
                id="signup_points"
                className="mono"
                value={settings.signup_points}
                onChange={(e) => setSettings({ ...settings, signup_points: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="referral_points">{t("admin.settings.referral_points_label", "Points per successful referral")}</label>
              <input
                id="referral_points"
                className="mono"
                value={settings.referral_points}
                onChange={(e) => setSettings({ ...settings, referral_points: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="brand_name">{t("admin.settings.brand_name_label", "Platform name")}</label>
              <input
                id="brand_name"
                value={settings.brand_name}
                onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
              />
            </div>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? t("admin.settings.save_button_loading", "Saving…") : t("admin.settings.save_button", "Save rules")}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>{t("admin.settings.ranks_title", "Rank ladder")}</h3>
          <table style={{ marginBottom: 18 }}>
            <thead><tr><th>Rank</th><th>Min. points</th><th></th></tr></thead>
            <tbody>
              {ranks.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <input
                      value={r.name}
                      onChange={(e) => {
                        const copy = [...ranks];
                        copy[i] = { ...copy[i], name: e.target.value };
                        setRanks(copy);
                      }}
                      style={{ padding: "6px 8px", fontSize: 13 }}
                    />
                  </td>
                  <td>
                    <input
                      className="mono"
                      value={r.min_points}
                      onChange={(e) => {
                        const copy = [...ranks];
                        copy[i] = { ...copy[i], min_points: e.target.value };
                        setRanks(copy);
                      }}
                      style={{ padding: "6px 8px", fontSize: 13, width: 90 }}
                    />
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => saveRank(r)}>{t("admin.settings.save_rank_button", "Save")}</button>
                    <button className="danger" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => removeRank(r.id)}>{t("admin.settings.delete_rank_button", "Delete")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ fontSize: 13.5, marginBottom: 10 }}>{t("admin.settings.add_rank_title", "Add a rank")}</h4>
          <form onSubmit={addRank} className="form-grid">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Name</label>
              <input value={newRankName} onChange={(e) => setNewRankName(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Min. points</label>
              <input className="mono" value={newRankPoints} onChange={(e) => setNewRankPoints(e.target.value)} />
            </div>
            <button className="primary" type="submit" style={{ gridColumn: "1 / -1" }}>{t("admin.settings.add_rank_button", "Add rank")}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

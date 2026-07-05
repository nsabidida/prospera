import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import "../styles/app.css";

export default function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const { t } = useContent();

  useEffect(() => {
    api.leaderboard().then((d) => setRows(d.leaderboard)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!rows) return <div className="muted">Loading leaderboard…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("leaderboard.eyebrow", "Standings")}</div>
          <h1 className="display page-title">{t("leaderboard.title", "Leaderboard")}</h1>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>{t("leaderboard.col_rank", "#")}</th>
              <th>{t("leaderboard.col_leader", "Prosperian")}</th>
              <th>{t("leaderboard.col_org", "Network size")}</th>
              <th>{t("leaderboard.col_points", "Points")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={user?.id === r.id ? { background: "rgba(179,130,42,0.06)" } : undefined}>
                <td className="mono faint">{i + 1}</td>
                <td>{r.name} {user?.id === r.id && <span className="pill pill-brass" style={{ marginLeft: 6 }}>{t("leaderboard.you_badge", "You")}</span>}</td>
                <td className="faint">{r.org_size}</td>
                <td className="mono" style={{ color: "var(--brass-soft)" }}>${r.points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

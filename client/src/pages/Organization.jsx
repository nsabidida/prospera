import { useEffect, useState } from "react";
import { api } from "../api";
import { useContent } from "../context/ContentContext";
import "../styles/app.css";

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function OrgNode({ node, isRoot, youLabel }) {
  return (
    <div className="org-node">
      <div className="org-node-row">
        <div className="avatar-dot">{initials(node.name)}</div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            {node.name} {isRoot && <span className="pill pill-brass" style={{ marginLeft: 6 }}>{youLabel}</span>}
          </div>
          <div className="faint mono" style={{ fontSize: 11 }}>{node.points.toLocaleString()} pts</div>
        </div>
      </div>
      {node.children?.length > 0 && (
        <div className="org-children">
          {node.children.map((c) => (
            <OrgNode key={c.id} node={c} youLabel={youLabel} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Organization() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const { t } = useContent();

  useEffect(() => {
    api.organization().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="muted">Loading network…</div>;

  const link = `${window.location.origin}/signup?ref=${data.referralCode}`;

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("organization.eyebrow", "Your network")}</div>
          <h1 className="display page-title">{t("organization.title", "Your Prospera network")}</h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 4 }}>{t("organization.recruit_title", "Grow your network")}</h3>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 14 }}>
          {t("organization.recruit_body", "Share your link. Everyone who joins through it becomes part of your network, and earns you points as your network prospers.")}
        </p>
        <div className="copy-row">
          <input readOnly className="mono" value={link} />
          <button className="primary" onClick={copyLink}>
            {copied ? t("organization.copy_button_done", "Copied!") : t("organization.copy_button", "Copy link")}
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15 }}>{t("organization.tree_title", "Network tree")}</h3>
          <span className="pill pill-muted">{data.totalOrgSize} total member{data.totalOrgSize === 1 ? "" : "s"}</span>
        </div>
        {data.totalOrgSize === 0 ? (
          <div className="empty-state">{t("organization.tree_empty", "No one in your network yet. Share your link above to start building.")}</div>
        ) : (
          <div className="org-tree">
            <OrgNode node={data.tree} isRoot youLabel={t("organization.you_badge", "You")} />
          </div>
        )}
      </div>
    </div>
  );
}

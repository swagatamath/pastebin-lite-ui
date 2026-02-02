import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import "./App.css";

const API_BASE = "";

async function safeJsonResponse(resp) {
  const text = await resp.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

export default function PasteView() {
  const { id } = useParams();
  const [paste, setPaste] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPaste() {
      if (!id) {
        setError("No paste ID provided");
        setLoading(false);
        return;
      }

      try {
        const r = await fetch(`${API_BASE}/api/pastes/${encodeURIComponent(id)}`, { method: "GET" });
        const { json, text } = await safeJsonResponse(r);

        if (!r.ok) {
          throw new Error(json?.error || `HTTP ${r.status} - ${text?.slice(0, 140) || "Not found"}`);
        }
        if (!json) {
          throw new Error(`Non-JSON response (HTTP ${r.status}).`);
        }

        setPaste(json);
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }

    fetchPaste();
  }, [id]);

  if (loading) {
    return (
      <div className="app-container">
        <div className="app-header">
          <h1 className="app-title">Pastebin Lite</h1>
          <p className="app-subtitle">Loading paste...</p>
        </div>
        <div className="main-content">
          <div className="card">
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <span className="loading-spinner" style={{ width: "24px", height: "24px" }}></span>
              <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Loading paste...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="app-header">
          <h1 className="app-title">Pastebin Lite</h1>
          <p className="app-subtitle">Paste not found</p>
        </div>
        <div className="main-content">
          <div className="card">
            <div className="status-message status-error">
              <strong>Error:</strong> {error}
            </div>
            <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
              <Link to="/" className="primary" style={{ textDecoration: "none", padding: "0.75rem 1.5rem", borderRadius: "8px", backgroundColor: "var(--accent-primary)", color: "white", display: "inline-block" }}>
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">Pastebin Lite</h1>
        <p className="app-subtitle">Viewing paste</p>
      </div>
      
      <div className="main-content">
        <div className="card">
          <div className="card-title" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span>📄 Paste Details</span>
            <Link to="/" className="secondary" style={{ textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.875rem", border: "1px solid var(--border-medium)", backgroundColor: "var(--bg-secondary)" }}>
              ← Back to Home
            </Link>
          </div>

          <div className="paste-result">
            <div className="paste-meta">
              <div className="paste-meta-item">
                <span className="paste-meta-label">ID:</span>
                <code className="paste-meta-value">{paste.id}</code>
              </div>
              {paste.created_at && (
                <div className="paste-meta-item">
                  <span className="paste-meta-label">Created:</span>
                  <span className="paste-meta-value">{new Date(paste.created_at).toLocaleString()}</span>
                </div>
              )}
              {paste.ttl_seconds && (
                <div className="paste-meta-item">
                  <span className="paste-meta-label">TTL:</span>
                  <span className="paste-meta-value">{paste.ttl_seconds} seconds</span>
                </div>
              )}
              {paste.max_views && (
                <div className="paste-meta-item">
                  <span className="paste-meta-label">Max Views:</span>
                  <span className="paste-meta-value">{paste.max_views}</span>
                </div>
              )}
              {paste.views !== undefined && (
                <div className="paste-meta-item">
                  <span className="paste-meta-label">Views:</span>
                  <span className="paste-meta-value">{paste.views}</span>
                </div>
              )}
            </div>

            {paste.content && (
              <>
                <div className="paste-actions">
                  <button 
                    onClick={() => navigator.clipboard?.writeText(paste.content)}
                    className="secondary"
                    style={{ fontSize: "0.875rem" }}
                  >
                    📋 Copy to Clipboard
                  </button>
                  <button 
                    onClick={() => {
                      const blob = new Blob([paste.content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `paste-${paste.id}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="secondary"
                    style={{ fontSize: "0.875rem" }}
                  >
                    💾 Download
                  </button>
                </div>
                
                <div className="paste-content">
                  <pre>{paste.content}</pre>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
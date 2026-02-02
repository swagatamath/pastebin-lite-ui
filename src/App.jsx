import { useMemo, useState } from "react";
import "./App.css";

/**
 * Same-domain deployment:
 * - UI served from /
 * - Backend served from /api/* and /p/*
 * So API_BASE stays empty.
 */
const API_BASE = "";

function parsePositiveIntOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return NaN;
  return n;
}

async function safeJsonResponse(resp) {
  // Some failures may return HTML (Vercel error page), so parse safely.
  const text = await resp.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

export default function App() {
  // Create form state
  const [content, setContent] = useState("");
  const [ttl, setTtl] = useState("");
  const [maxViews, setMaxViews] = useState("");

  // Create results
  const [createRes, setCreateRes] = useState(null);
  const [createErr, setCreateErr] = useState("");

  // Fetch state
  const [pasteId, setPasteId] = useState("");
  const [fetchRes, setFetchRes] = useState(null);
  const [fetchErr, setFetchErr] = useState("");

  // Health state (separate so it doesn't overwrite fetch result)
  const [healthRes, setHealthRes] = useState(null);
  const [healthErr, setHealthErr] = useState("");

  const [loading, setLoading] = useState(false);

  const origin = useMemo(() => {
    // Works on localhost + Vercel
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const pasteUrl = useMemo(() => {
    if (!createRes?.id) return "";
    return `/p/${createRes.id}`;
  }, [createRes]);

  const apiJsonUrl = useMemo(() => {
    if (!createRes?.id) return "";
    return `/api/pastes/${createRes.id}`;
  }, [createRes]);

  async function checkHealth() {
    setHealthErr("");
    setHealthRes(null);
    setLoading(true);

    try {
      const r = await fetch(`${API_BASE}/api/healthz`, { method: "GET" });
      const { json, text } = await safeJsonResponse(r);

      if (!r.ok) {
        throw new Error(json?.error || `HTTP ${r.status} - ${text?.slice(0, 120) || "error"}`);
      }
      if (!json) {
        throw new Error(`Healthz returned non-JSON (HTTP ${r.status}).`);
      }

      setHealthRes(json);
    } catch (e) {
      setHealthErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function createPaste() {
    setCreateErr("");
    setCreateRes(null);

    const ttlVal = parsePositiveIntOrNull(ttl);
    const mvVal = parsePositiveIntOrNull(maxViews);

    if (!content.trim()) {
      setCreateErr("Content is required.");
      return;
    }
    if (Number.isNaN(ttlVal)) {
      setCreateErr("ttl_seconds must be an integer ≥ 1");
      return;
    }
    if (Number.isNaN(mvVal)) {
      setCreateErr("max_views must be an integer ≥ 1");
      return;
    }

    const body = { content: content.trim() };
    if (ttlVal != null) body.ttl_seconds = ttlVal;
    if (mvVal != null) body.max_views = mvVal;

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/pastes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const { json, text } = await safeJsonResponse(r);

      if (!r.ok) {
        throw new Error(json?.error || `HTTP ${r.status} - ${text?.slice(0, 140) || "error"}`);
      }
      if (!json?.id) {
        throw new Error("Unexpected response: missing paste id.");
      }

      setCreateRes(json);
      setPasteId(json.id); // auto-fill for fetch test
    } catch (e) {
      setCreateErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function fetchPaste() {
    setFetchErr("");
    setFetchRes(null);

    const id = pasteId.trim();
    if (!id) {
      setFetchErr("Paste ID is required.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/pastes/${encodeURIComponent(id)}`, { method: "GET" });
      const { json, text } = await safeJsonResponse(r);

      if (!r.ok) {
        // Your API returns JSON {error:"Not found"} for 404
        throw new Error(json?.error || `HTTP ${r.status} - ${text?.slice(0, 140) || "Not found"}`);
      }
      if (!json) {
        throw new Error(`Non-JSON response (HTTP ${r.status}).`);
      }

      setFetchRes(json);
    } catch (e) {
      setFetchErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading;

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">Pastebin Lite</h1>
        <p className="app-subtitle">Simple, fast, and secure text sharing</p>
      </div>

      <div className="main-content">
        <div className="origin-info">
          Running on: <code>{origin || "(loading...)"}</code>
          <span style={{ marginLeft: 10, opacity: 0.7 }}>(UI + API are same domain)</span>
        </div>

        <div className="grid-container">
          {/* Create */}
          <div className="card">
            <h3 className="card-title">📝 Create Paste</h3>

            <div className="form-group">
              <label>Content *</label>
              <textarea
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your paste text..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>TTL Seconds (optional)</label>
                <input
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                  placeholder="e.g. 60"
                />
              </div>
              <div className="form-group">
                <label>Max Views (optional)</label>
                <input
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  placeholder="e.g. 2"
                />
              </div>
            </div>

            <div className="button-group">
              <button
                onClick={createPaste}
                disabled={disabled}
                className="primary"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Creating...
                  </>
                ) : (
                  "Create Paste"
                )}
              </button>

              <button
                onClick={() => {
                  setContent("");
                  setTtl("");
                  setMaxViews("");
                  setCreateRes(null);
                  setCreateErr("");
                }}
                disabled={disabled}
                className="secondary"
              >
                Clear
              </button>
            </div>

            {createErr && (
              <div className="status-message status-error">
                <strong>Error:</strong> {createErr}
              </div>
            )}

            {createRes && (
              <div className="status-message status-success">
                <div className="paste-meta">
                  <div className="paste-meta-item">
                    <span className="paste-meta-label">ID:</span>
                    <code className="paste-meta-value">{createRes.id}</code>
                  </div>
                  <div className="paste-meta-item">
                    <span className="paste-meta-label">HTML URL:</span>
                    <a href={pasteUrl} target="_blank" rel="noreferrer" className="external-link">
                      {origin}{pasteUrl}
                    </a>
                  </div>
                  <div className="paste-meta-item">
                    <span className="paste-meta-label">API JSON:</span>
                    <a href={apiJsonUrl} target="_blank" rel="noreferrer" className="external-link">
                      {origin}{apiJsonUrl}
                    </a>
                    <span style={{ fontSize: "0.75rem", opacity: 0.7, marginLeft: "0.5rem" }}>(counts as a view)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fetch */}
          <div className="card">
            <h3 className="card-title">🔍 Fetch Paste</h3>

            <div className="fetch-container">
              <div className="fetch-input">
                <label>Paste ID</label>
                <input
                  value={pasteId}
                  onChange={(e) => setPasteId(e.target.value)}
                  placeholder="Enter paste ID (e.g. abc123...)"
                />
              </div>
              <button
                onClick={fetchPaste}
                disabled={disabled}
                className="primary"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Fetching...
                  </>
                ) : (
                  "Fetch"
                )}
              </button>
            </div>

            <div className="button-group-inline" style={{ marginTop: "1rem" }}>
              <button
                onClick={checkHealth}
                disabled={disabled}
                className="secondary"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Checking...
                  </>
                ) : (
                  "Check Health"
                )}
              </button>

              {pasteId.trim() && (
                <a href={`/p/${pasteId.trim()}`} target="_blank" rel="noreferrer" className="external-link">
                  Open HTML View
                </a>
              )}
            </div>

            {/* Health output */}
            {(healthErr || healthRes) && (
              <div className={`status-message ${healthErr ? 'status-error' : 'status-info'}`}>
                <strong>Health Check:</strong>{" "}
                {healthErr ? (
                  healthErr
                ) : (
                  <code>{JSON.stringify(healthRes)}</code>
                )}
              </div>
            )}

            {fetchErr && (
              <div className="status-message status-error">
                <strong>Error:</strong> {fetchErr}
              </div>
            )}

            {fetchRes && (
              <div className="status-message status-success">
                <div className="paste-result">
                  <div className="paste-meta">
                    <div className="paste-meta-item">
                      <span className="paste-meta-label">ID:</span>
                      <span className="paste-meta-value">{fetchRes.id}</span>
                    </div>
                    {fetchRes.created_at && (
                      <div className="paste-meta-item">
                        <span className="paste-meta-label">Created:</span>
                        <span className="paste-meta-value">{new Date(fetchRes.created_at).toLocaleString()}</span>
                      </div>
                    )}
                    {fetchRes.ttl_seconds && (
                      <div className="paste-meta-item">
                        <span className="paste-meta-label">TTL:</span>
                        <span className="paste-meta-value">{fetchRes.ttl_seconds}s</span>
                      </div>
                    )}
                    {fetchRes.max_views && (
                      <div className="paste-meta-item">
                        <span className="paste-meta-label">Max Views:</span>
                        <span className="paste-meta-value">{fetchRes.max_views}</span>
                      </div>
                    )}
                  </div>

                  {fetchRes.content && (
                    <div className="paste-content">
                      <pre>{fetchRes.content}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
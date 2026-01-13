import React from "react";
import type { RecipeDraft } from "../../types/recipe";

function fmtNum(n: number | null | undefined, digits = 3) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return n.toFixed(digits);
}

export function RecipeBuilder(props: {
  data: RecipeDraft | null;
  loading: boolean;
  error?: string | null;
}) {
  if (props.loading) {
    return (
      <div className="panel">
        <div className="panelHeader">
          <h2>Builder</h2>
          <div className="tiny">Loading…</div>
        </div>
        <div style={{ padding: 14 }}>
          <div className="skeleton" style={{ height: 18, width: "40%", marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 220, width: "100%" }} />
        </div>
      </div>
    );
  }

  if (props.error) {
    return (
      <div className="panel">
        <div className="panelHeader">
          <h2>Builder</h2>
          <div className="tiny">Error</div>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ color: "rgba(251,113,133,0.92)", fontWeight: 650 }}>Failed to load draft</div>
          <div className="tiny" style={{ marginTop: 6 }}>{props.error}</div>
        </div>
      </div>
    );
  }

  if (!props.data) {
    return (
      <div className="panel">
        <div className="panelHeader">
          <h2>Builder</h2>
          <div className="tiny">No draft</div>
        </div>
        <div style={{ padding: 14 }}>
          <div className="muted">Select a recipe, then open Builder.</div>
        </div>
      </div>
    );
  }

  const d = props.data;

  return (
    <div className="panel">
      <div className="panelHeader">
        <h2>Builder</h2>
        <div className="tiny">Draft: {d.draft_id}</div>
      </div>

      <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 360px", gap: 12 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>Formula</div>
            <button className="btn">Save</button>
          </div>

          <div className="tiny" style={{ marginTop: 6, marginBottom: 10 }}>
            (Editing + add ingredient search is next. This is the “view first” version.)
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
            {d.line_items.map((li) => (
              <React.Fragment key={li.ingredient_id}>
                <div className="small" style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {li.name}
                </div>
                <div className="small" style={{ padding: "8px 0", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {fmtNum(li.pct, 3)}%
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 800 }}>Rollups</div>
          <div style={{ marginTop: 10 }} className="small">
            Total: <b>{fmtNum(d.rollups?.total_pct ?? null, 3)}%</b>
          </div>
          <div className="small">Cost/kg: <b>£{(d.rollups?.cost_per_kg ?? null) === null ? "–" : (d.rollups?.cost_per_kg as number).toFixed(2)}</b></div>
          <div className="small">Protein/100g: <b>{(d.rollups?.protein_per_100g ?? null) === null ? "–" : (d.rollups?.protein_per_100g as number).toFixed(1)}</b></div>
          <div className="small">Sugar/100g: <b>{(d.rollups?.sugar_per_100g ?? null) === null ? "–" : (d.rollups?.sugar_per_100g as number).toFixed(1)}</b></div>

          <hr className="sep" />

          <div style={{ fontWeight: 800 }}>Warnings</div>
          <div style={{ marginTop: 8 }}>
            {d.warnings?.length ? (
              d.warnings.map((w) => (
                <div
                  key={w.code + w.message}
                  className="card"
                  style={{ borderColor: "rgba(251,113,133,0.30)", background: "rgba(251,113,133,0.08)", marginBottom: 8 }}
                >
                  <div style={{ fontWeight: 700 }}>{w.code}</div>
                  <div className="tiny">{w.message}</div>
                </div>
              ))
            ) : (
              <div className="muted small">None</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

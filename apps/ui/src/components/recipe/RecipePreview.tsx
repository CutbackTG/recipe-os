import type { RecipePreview as Preview } from "../../types/recipe";

function fmtNum(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return n.toFixed(digits);
}

export function RecipePreview(props: {
  data: Preview | null;
  loading: boolean;
  error?: string | null;
  onOpenBuilder: () => void;
}) {
  if (props.loading) {
    return (
      <div className="panel">
        <div className="panelHeader">
          <h2>Preview</h2>
          <div className="tiny">Loading…</div>
        </div>
        <div style={{ padding: 14 }}>
          <div className="skeleton" style={{ height: 22, width: "60%", marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 22 }} />
          <div className="skeleton" style={{ height: 90, width: "100%" }} />
        </div>
      </div>
    );
  }

  if (props.error) {
    return (
      <div className="panel">
        <div className="panelHeader">
          <h2>Preview</h2>
          <div className="tiny">Error</div>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ color: "rgba(251,113,133,0.92)", fontWeight: 650 }}>Failed to load preview</div>
          <div className="tiny" style={{ marginTop: 6 }}>{props.error}</div>
        </div>
      </div>
    );
  }

  if (!props.data) {
    return (
      <div className="panel">
        <div className="panelHeader">
          <h2>Preview</h2>
          <div className="tiny">Select a recipe</div>
        </div>
        <div style={{ padding: 14 }}>
          <div className="muted">Pick a recipe from results.</div>
          <div className="tiny">Tip: Ctrl/Cmd+K, type, Enter.</div>
        </div>
      </div>
    );
  }

  const r = props.data;

  return (
    <div className="panel">
      <div className="panelHeader">
        <h2>Recipe</h2>
        <button className="btn btnPrimary" onClick={props.onOpenBuilder}>
          Open Builder
        </button>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>{r.name}</div>
            <div className="tiny" style={{ marginTop: 4 }}>
              {r.code ?? "—"} • {r.tags?.join(" • ") || "no tags"}
            </div>
          </div>
        </div>

        <hr className="sep" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <div className="card">
            <div className="tiny">Cost / kg</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>
              £{fmtNum(r.kpis?.cost_per_kg ?? null, 2)}
            </div>
          </div>
          <div className="card">
            <div className="tiny">Protein / 100g</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>
              {fmtNum(r.kpis?.protein_per_100g ?? null, 1)}
            </div>
          </div>
          <div className="card">
            <div className="tiny">Sugar / 100g</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>
              {fmtNum(r.kpis?.sugar_per_100g ?? null, 1)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }} className="card">
          <div className="tiny">Allergens</div>
          <div style={{ marginTop: 6 }} className="small">
            {r.allergens?.length ? r.allergens.join(", ") : "—"}
          </div>
        </div>

        <div style={{ marginTop: 12 }} className="card">
          <div className="tiny">Key ingredients</div>
          <div style={{ marginTop: 8 }}>
            {r.top_ingredients?.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {r.top_ingredients.slice(0, 10).map((x) => (
                  <span key={x.name} className="pill" style={{ color: "rgba(255,255,255,0.86)" }}>
                    {x.name} <span className="tiny"> {x.pct.toFixed(3)}%</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="muted small">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { SearchItem } from "../../types/search";

export function ResultsList(props: {
  title: string;
  items: SearchItem[];
  loading: boolean;
  error?: string | null;
  selectedId?: string | null;
  onPick: (item: SearchItem) => void;
}) {
  return (
    <div className="panel">
      <div className="panelHeader">
        <h2>{props.title}</h2>
        <div className="tiny">{props.loading ? "Loading…" : `${props.items.length} items`}</div>
      </div>
      <div className="list">
        {props.error && (
          <div className="card" style={{ borderColor: "rgba(251,113,133,0.35)" }}>
            <div style={{ color: "rgba(251,113,133,0.92)", fontWeight: 650 }}>Search error</div>
            <div className="tiny">{props.error}</div>
          </div>
        )}

        {!props.loading && !props.error && props.items.length === 0 && (
          <div className="card">
            <div className="muted">No results.</div>
            <div className="tiny">Try a name, code, or tag.</div>
          </div>
        )}

        {props.items.map((it) => {
          const selected = props.selectedId === it.id;
          return (
            <button
              key={`${it.type}:${it.id}`}
              className="card"
              onClick={() => props.onPick(it)}
              style={{
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                marginBottom: 8,
                background: selected ? "rgba(125,211,252,0.10)" : "rgba(255,255,255,0.035)",
                borderColor: selected ? "rgba(125,211,252,0.28)" : "rgba(255,255,255,0.12)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{it.name}</div>
                <div className="tiny">{it.code ?? ""}</div>
              </div>
              {it.subtext && <div className="tiny" style={{ marginTop: 3 }}>{it.subtext}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

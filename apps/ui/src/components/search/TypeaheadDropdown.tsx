import { useEffect, useMemo, useState } from "react";
import type { TypeaheadItem } from "../../types/search";

function typeLabel(t: string) {
  return t === "recipe" ? "Recipe" : "Ingredient";
}

export function TypeaheadDropdown(props: {
  open: boolean;
  items: TypeaheadItem[];
  loading: boolean;
  error?: string | null;
  onPick: (item: TypeaheadItem) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);

  const safeItems = useMemo(() => props.items ?? [], [props.items]);

  useEffect(() => {
    if (!props.open) return;
    setIdx(0);
  }, [props.open, safeItems.length]);

  useEffect(() => {
    if (!props.open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        props.onClose();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, safeItems.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        if (safeItems[idx]) {
          e.preventDefault();
          props.onPick(safeItems[idx]);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.open, idx, safeItems, props]);

  if (!props.open) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 54,
        left: 0,
        right: 0,
        zIndex: 50,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(10, 14, 22, 0.92)",
        backdropFilter: "blur(10px)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="tiny">
          ↑ ↓ to navigate • Enter to open • Esc to close
        </div>
      </div>

      {props.loading && (
        <div style={{ padding: 12 }} className="muted small">
          Searching…
        </div>
      )}

      {props.error && (
        <div style={{ padding: 12, color: "rgba(251,113,133,0.92)" }} className="small">
          {props.error}
        </div>
      )}

      {!props.loading && !props.error && safeItems.length === 0 && (
        <div style={{ padding: 12 }} className="muted small">
          No matches.
        </div>
      )}

      {!props.loading && !props.error && safeItems.length > 0 && (
        <div style={{ maxHeight: 360, overflow: "auto" }}>
          {safeItems.map((it, i) => {
            const selected = i === idx;
            return (
              <div
                key={`${it.type}:${it.id}`}
                onMouseEnter={() => setIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  props.onPick(it);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 1fr 120px",
                  gap: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: selected ? "rgba(125,211,252,0.10)" : "transparent",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  alignItems: "center",
                }}
              >
                <div className="tiny" style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {typeLabel(it.type)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 650 }}>{it.name}</div>
                  {it.subtext && <div className="tiny">{it.subtext}</div>}
                </div>
                <div style={{ textAlign: "right" }} className="tiny">
                  {it.code ?? ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

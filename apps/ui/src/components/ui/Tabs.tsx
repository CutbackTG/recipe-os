export type Tab = { key: string; label: string };

export function Tabs(props: {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {props.tabs.map((t) => {
        const on = t.key === props.active;
        return (
          <button
            key={t.key}
            className="btn"
            onClick={() => props.onChange(t.key)}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              background: on ? "rgba(125,211,252,0.14)" : undefined,
              borderColor: on ? "rgba(125,211,252,0.28)" : undefined,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

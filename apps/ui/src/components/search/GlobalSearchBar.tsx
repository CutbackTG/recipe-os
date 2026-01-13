import { useEffect, useRef } from "react";

export function GlobalSearchBar(props: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onFocus?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === "k";
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Enter" && document.activeElement === inputRef.current) {
        e.preventDefault();
        props.onSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props]);

  return (
    <div style={{ flex: 1, position: "relative", minWidth: 320 }}>
      <input
        ref={inputRef}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onFocus={props.onFocus}
        placeholder="Search recipes & ingredients… (Ctrl/Cmd+K)"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          outline: "none",
          background: "rgba(0,0,0,0.24)",
          color: "rgba(255,255,255,0.92)",
          fontSize: 14,
        }}
      />
      <div style={{ position: "absolute", right: 10, top: 10 }}>
        <span className="kbd">Ctrl</span>{" "}
        <span className="kbd" style={{ marginLeft: 4 }}>
          K
        </span>
      </div>
    </div>
  );
}

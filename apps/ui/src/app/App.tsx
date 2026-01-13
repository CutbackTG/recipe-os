import { useMemo, useState, useEffect } from "react";
import { GlobalSearchBar } from "../components/search/GlobalSearchBar";
import { TypeaheadDropdown } from "../components/search/TypeaheadDropdown";
import { ResultsList } from "../components/results/ResultsList";
import { RecipeTabs, type RecipeTabKey } from "../components/recipe/RecipeTabs";
import { RecipePreview } from "../components/recipe/RecipePreview";
import { RecipeBuilder } from "../components/recipe/RecipeBuilder";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useTypeaheadQuery } from "../hooks/useTypeahead";
import { useSearchQuery } from "../hooks/useSearch";
import { useRecipePreview } from "../hooks/useRecipePreview";
import { useRecipeDraft } from "../hooks/useRecipeDraft";
import type { TypeaheadItem, SearchItem } from "../types/search";

const DEFAULT_TENANT = "demo";
const DEFAULT_SITE = "default";

type Theme = "dark" | "light";

function loadTheme(): Theme {
  try {
    const v = localStorage.getItem("recipeos_theme");
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export default function App() {
  const [tenantId] = useState(DEFAULT_TENANT);
  const [siteId] = useState(DEFAULT_SITE);

  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  useEffect(() => {
    try {
      localStorage.setItem("recipeos_theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 180);

  const [typeaheadOpen, setTypeaheadOpen] = useState(false);

  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RecipeTabKey>("preview");

  const typeaheadEnabled = typeaheadOpen && qDebounced.trim().length > 0;

  const ta = useTypeaheadQuery({
    q: qDebounced,
    tenant_id: tenantId,
    site_id: siteId,
    enabled: typeaheadEnabled,
  });

  const srch = useSearchQuery({
    q: qDebounced,
    tenant_id: tenantId,
    site_id: siteId,
    enabled: qDebounced.trim().length > 0,
  });

  const preview = useRecipePreview(selectedRecipeId);
  const draft = useRecipeDraft(selectedRecipeId, activeTab === "builder");

  const selectedFromResults = useMemo(() => {
    return srch.items.find((x) => x.id === selectedRecipeId) ?? null;
  }, [srch.items, selectedRecipeId]);

  function pickItem(it: TypeaheadItem | SearchItem) {
    if (it.type === "recipe") {
      setSelectedRecipeId(it.id);
      setActiveTab("preview");
    }
    setTypeaheadOpen(false);
  }

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <div className={`container ${theme === "light" ? "theme-light" : ""}`}>
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>RecipeOS</h1>
            <p>Search-first workspace</p>
          </div>
        </div>

        <div style={{ position: "relative", flex: 1 }}>
          <GlobalSearchBar
            value={q}
            onChange={(v) => {
              setQ(v);
              setTypeaheadOpen(true);
            }}
            onSubmit={() => {
              setTypeaheadOpen(false);
              const first = ta.items?.[0];
              if (first) pickItem(first);
            }}
            onFocus={() => setTypeaheadOpen(true)}
          />
          <TypeaheadDropdown
            open={typeaheadOpen}
            items={ta.items}
            loading={ta.loading}
            error={ta.error}
            onPick={(it) => pickItem(it)}
            onClose={() => setTypeaheadOpen(false)}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="pill">{tenantId}</span>
          <span className="pill">{siteId}</span>

          <button className="btn" onClick={toggleTheme} title="Toggle light/dark mode">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <button className="btn btnPrimary">+ New Recipe</button>
        </div>
      </div>

      <div className="row">
        <ResultsList
          title="Recipes"
          items={srch.items.filter((x) => x.type === "recipe")}
          loading={srch.loading}
          error={srch.error}
          selectedId={selectedRecipeId}
          onPick={(it) => pickItem(it)}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="panel">
            <div className="panelHeader">
              <h2>
                Workspace{" "}
                <span className="tiny">
                  {selectedFromResults?.code ? `• ${selectedFromResults.code}` : ""}
                </span>
              </h2>
              <RecipeTabs active={activeTab} onChange={(k) => setActiveTab(k)} />
            </div>
          </div>

          {activeTab === "preview" && (
            <RecipePreview
              data={preview.data}
              loading={preview.loading}
              error={preview.error}
              onOpenBuilder={() => setActiveTab("builder")}
            />
          )}

          {activeTab === "builder" && (
            <RecipeBuilder data={draft.data} loading={draft.loading} error={draft.error} />
          )}

          {activeTab === "specs" && (
            <div className="panel">
              <div className="panelHeader">
                <h2>Specs</h2>
                <div className="tiny">Coming next</div>
              </div>
              <div style={{ padding: 14 }} className="muted small">
                Specs tab placeholder. We’ll fill this once preview+builder feel perfect.
              </div>
            </div>
          )}

          {activeTab === "versions" && (
            <div className="panel">
              <div className="panelHeader">
                <h2>Versions</h2>
                <div className="tiny">Coming next</div>
              </div>
              <div style={{ padding: 14 }} className="muted small">
                Versions tab placeholder (diffs + history).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

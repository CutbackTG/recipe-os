import React from "react";
import { Tabs } from "../ui/Tabs";

export type RecipeTabKey = "preview" | "builder" | "specs" | "versions";

export function RecipeTabs(props: {
  active: RecipeTabKey;
  onChange: (k: RecipeTabKey) => void;
}) {
  return (
    <Tabs
      active={props.active}
      onChange={(k) => props.onChange(k as RecipeTabKey)}
      tabs={[
        { key: "preview", label: "Preview" },
        { key: "builder", label: "Builder" },
        { key: "specs", label: "Specs" },
        { key: "versions", label: "Versions" },
      ]}
    />
  );
}

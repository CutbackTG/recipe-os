export type SearchType = "recipe" | "ingredient";

export type TypeaheadItem = {
  type: SearchType;
  id: string;
  code?: string | null;
  name: string;
  badges?: string[];
  subtext?: string | null;
  highlights?: string[];
};

export type TypeaheadResponse = {
  q: string;
  took_ms?: number;
  items: TypeaheadItem[];
};

export type SearchItem = {
  type: SearchType;
  id: string;
  code?: string | null;
  name: string;
  subtext?: string | null;
  score?: number;
};

export type SearchResponse = {
  items: SearchItem[];
  next_cursor?: string | null;
  took_ms?: number;
};

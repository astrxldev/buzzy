"use client";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./ui/spinner";

type Token =
  | { type: "text"; value: string; start: number; end: number }
  | { type: "filter"; key: string; value?: string; start: number; end: number };

interface InputContext {
  mode: "text" | "filterKey" | "filterValue";
  activeFilter?: string;
  token?: Token;
}

export interface ParsedQuery {
  search: string;
  filters: Record<string, string>;
}

/** Split text into tokens and track their ranges */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  const parts = input.split(/(\s+)/);
  for (const part of parts) {
    const start = cursor;
    const end = start + part.length;
    cursor = end;

    if (!part.trim()) continue;

    const colonIndex = part.indexOf(":");
    if (colonIndex !== -1) {
      const key = part.slice(0, colonIndex);
      const val = part.slice(colonIndex + 1);
      tokens.push({
        type: "filter",
        key,
        value: val || undefined,
        start,
        end,
      });
    } else {
      tokens.push({ type: "text", value: part, start, end });
    }
  }

  return tokens;
}

/** Parse query into search text and filters */
function parseQuery(input: string): ParsedQuery {
  const tokens = tokenize(input);
  const searchParts: string[] = [];
  const filters: Record<string, string> = {};

  for (const token of tokens) {
    if (token.type === "filter" && token.value) {
      filters[token.key] = token.value;
    } else if (token.type === "text") {
      searchParts.push(token.value);
    }
  }

  return {
    search: searchParts.join(" ").trim(),
    filters,
  };
}

/** Determine which token and mode the caret is inside */
function detectContext(input: string, caret: number): InputContext {
  const tokens = tokenize(input);

  // Find token at caret position
  const token = tokens.find((t) => caret >= t.start && caret <= t.end);

  if (!token) {
    // Check if we're right after a token
    const prevToken = tokens.find((t) => t.end === caret);
    if (prevToken?.type === "filter" && !prevToken.value) {
      return {
        mode: "filterValue",
        activeFilter: prevToken.key,
        token: prevToken,
      };
    }
    return { mode: "text" };
  }

  if (token.type === "filter") {
    const colonPos = input.indexOf(":", token.start);
    if (colonPos === -1 || caret <= colonPos) {
      return { mode: "filterKey", token };
    } else {
      return { mode: "filterValue", activeFilter: token.key, token };
    }
  }

  // Check if text token looks like it's starting a filter
  if (token.type === "text" && token.value.endsWith(":")) {
    const key = token.value.slice(0, -1);
    return { mode: "filterValue", activeFilter: key, token };
  }

  return { mode: "filterKey", token };
}

export type Filter = () => Promise<string[]> | string[];
export type Filters = Record<string, Filter>;

/** Filter colors for highlighting */
const filterColors: string[] = [
  "bg-blue-700 text-blue-100",
  "bg-purple-700 text-purple-100",
  "bg-green-700 text-green-100",
  "bg-orange-700 text-orange-100",
  "bg-yellow-700 text-yellow-100",
  "bg-red-700 text-red-100",
];

/** Get suggestions based on caret context */
async function getSuggestions(input: string, caret: number, filters: Filters) {
  const ctx = detectContext(input, caret);

  if (ctx.mode === "filterKey") {
    const partial =
      ctx.token?.type === "text" ? ctx.token.value.toLowerCase() : "";
    return Object.keys(filters)
      .filter((f) => f.startsWith(partial))
      .map((f) => `${f}:`);
  }

  if (ctx.mode === "filterValue" && ctx.activeFilter) {
    const source = filters[ctx.activeFilter];
    if (source) {
      const values = await source();
      const partial =
        ctx.token?.type === "filter" && ctx.token.value
          ? ctx.token.value.toLowerCase()
          : "";
      return values.filter((v) => v.toLowerCase().includes(partial));
    }
  }

  return [];
}

export default function SearchBox({
  onChange = () => {}, // Prevent react screaming about undefined dependencies
  onQueryChange = () => {},
  filters,
  value = "",
  className,
}: {
  onChange?: (value: string) => void;
  onQueryChange?: (value: ParsedQuery) => void;
  className?: string;
  filters: Filters;
  value?: string;
}) {
  const [query, setQuery] = useState(value);

  useEffect(() => onChange?.(query), [onChange, query]);

  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery>({
    search: "",
    filters: {},
  });

  useEffect(() => onQueryChange?.(parsedQuery), [onQueryChange, parsedQuery]);

  const inputRef = useRef<HTMLInputElement>(null);

  async function updateSuggestions(newValue: string, caretPos?: number) {
    const caret =
      caretPos ?? inputRef.current?.selectionStart ?? newValue.length;
    setSuggestionLoading(true);
    const items = await getSuggestions(newValue, caret, filters).finally(() =>
      setSuggestionLoading(false),
    );
    setSuggestions(items);
    setHighlight(0);
    setIsOpen(items.length > 0);
    setParsedQuery(parseQuery(newValue));
  }

  function applySuggestion(s: string) {
    const caret = inputRef.current?.selectionStart ?? query.length;
    const ctx = detectContext(query, caret);

    if (!ctx.token) {
      setQuery(`${query}${s} `);
      setIsOpen(false);
      inputRef.current?.focus();
      return;
    }

    const before = query.slice(0, ctx.token.start);
    const after = query.slice(ctx.token.end);
    let replacement = "";

    if (ctx.mode === "filterKey") {
      replacement = s;
    } else if (ctx.mode === "filterValue") {
      replacement = `${ctx.activeFilter}:${s}`;
    }

    const newQuery = `${before}${replacement}${after}`.trim();
    setQuery(`${newQuery} `);
    setIsOpen(false);
    setParsedQuery(parseQuery(`${newQuery} `));

    // Focus back and move caret to end
    setTimeout(() => {
      inputRef.current?.focus();
      const newPos = before.length + replacement.length + 1;
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Render highlighted input
  function renderHighlightedInput() {
    const tokens = tokenize(query);
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    tokens.forEach((token, i) => {
      const idx = i;
      // Add any text before this token
      if (token.start > lastEnd) {
        parts.push(
          <span key={`gap-${idx}`}>{query.slice(lastEnd, token.start)}</span>,
        );
      }

      // Add the token
      if (token.type === "filter" && token.value) {
        const filterId = Object.keys(filters).indexOf(token.key);
        const colorClass =
          filterId < 0
            ? "text-gray-500"
            : filterColors[filterId % filterColors.length];
        parts.push(
          <span key={`token-${idx}`} className={`${colorClass} rounded`}>
            {query.slice(token.start, token.end)}
          </span>,
        );
      } else {
        parts.push(
          <span key={`token-${idx}`}>
            {query.slice(token.start, token.end)}
          </span>,
        );
      }

      lastEnd = token.end;
    });

    // Add any remaining text
    if (lastEnd < query.length) {
      parts.push(<span key="end">{query.slice(lastEnd)}</span>);
    }

    return parts;
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="relative">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

          {/* Highlighted overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden pr-9 pl-9">
            <div className="text-sm whitespace-pre">
              {renderHighlightedInput()}
            </div>
          </div>

          {/* Actual input (transparent text) */}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              updateSuggestions(e.target.value);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (!isOpen) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  updateSuggestions(query);
                }
                return;
              }

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((i) => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && suggestions[highlight]) {
                e.preventDefault();
                applySuggestion(suggestions[highlight]);
              } else if (e.key === "Escape") {
                setIsOpen(false);
              } else if (e.key === "Tab" && suggestions[highlight]) {
                e.preventDefault();
                applySuggestion(suggestions[highlight]);
              }
            }}
            className={cn(
              "relative h-10 w-full rounded-md border bg-transparent pr-9 pl-9 text-sm text-transparent caret-black ring-offset-gray-400 placeholder:text-slate-500 focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            placeholder={`Search...${Object.keys(filters).length ? " Try: " : ""}${Object.keys(
              filters,
            )
              .slice(0, 4)
              .map((f) => `${f}:`)
              .join(" ")}`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setIsOpen(false);
                setParsedQuery({ search: "", filters: {} });
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 right-3 z-10 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {isOpen && (suggestions.length > 0 || suggestionLoading) && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-card shadow-lg">
            <ul className="max-h-64 overflow-auto py-1">
              {suggestionLoading ? (
                <li className="relative mx-1 flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none hover:brightness-125">
                  <Spinner /> Loading...
                </li>
              ) : (
                suggestions.map((s, i) => (
                  <li
                    key={`${s}-${i + 1}`}
                    onClick={() => applySuggestion(s)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`
                    relative mx-1 flex cursor-pointer items-center rounded-sm px-3 py-2 text-sm outline-none select-none
                    ${i === highlight ? "bg-muted" : "hover:brightness-125"}
                  `}
                  >
                    {s}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

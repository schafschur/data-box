import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useSearch } from "@workspace/api-client-react";
import type { SearchResult } from "@workspace/api-client-react";
import { Search, FileText, CheckSquare, CalendarDays, Image, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

function blockIcon(type: string | null) {
  switch (type) {
    case "richtext": return <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    case "todo": return <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    case "calendar": return <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    case "photo": return <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    default: return <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

export function SearchBar() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isFetching } = useSearch(
    { q: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.trim().length >= 2,
        staleTime: 30_000,
      },
    },
  );

  const showDropdown = open && debouncedQuery.trim().length >= 2;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(result: SearchResult) {
    const url =
      result.type === "block" && result.blockId != null
        ? `/instances/${result.instanceId}#block-${result.blockId}`
        : `/instances/${result.instanceId}`;
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
    navigate(url);
  }

  const instanceResults = results?.filter((r) => r.type === "instance") ?? [];
  const blockResults = results?.filter((r) => r.type === "block") ?? [];
  const hasResults = (results?.length ?? 0) > 0;

  return (
    <div className="relative px-4 pb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search…"
          className={cn(
            "w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          )}
        />
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-4 right-4 top-full z-50 mt-1 rounded-md border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden"
        >
          {isFetching && !results && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          )}

          {!isFetching && !hasResults && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No results found.</div>
          )}

          {hasResults && (
            <div className="max-h-72 overflow-y-auto py-1">
              {instanceResults.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Instances
                  </div>
                  {instanceResults.map((r) => (
                    <button
                      key={`instance-${r.instanceId}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(r)}
                      className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
                    >
                      <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.instanceName}</div>
                        {r.snippet && (
                          <div className="text-xs text-muted-foreground truncate">{r.snippet}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}

              {blockResults.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Blocks
                  </div>
                  {blockResults.map((r) => (
                    <button
                      key={`block-${r.blockId}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(r)}
                      className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
                    >
                      {blockIcon(r.blockType)}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {r.blockTitle ?? `Untitled ${r.blockType ?? "block"}`}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">in {r.instanceName}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

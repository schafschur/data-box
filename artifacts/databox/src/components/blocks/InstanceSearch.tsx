import { useEffect, useRef, useState, type ComponentType } from "react";
import { Search, X, FileText, CheckSquare, Calendar, Image as ImageIcon, FileIcon, Users, List } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SearchHit {
  blockId: number;
  blockType: string;
  blockTitle: string | null;
  matchType: string;
  snippet: string;
}

const BLOCK_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  richtext: FileText,
  todo:     CheckSquare,
  calendar: Calendar,
  photo:    ImageIcon,
  pdf:      FileIcon,
  contact:  Users,
  list:     List,
};

const BLOCK_COLORS: Record<string, string> = {
  richtext: "text-blue-500",
  todo:     "text-green-500",
  calendar: "text-purple-500",
  photo:    "text-orange-500",
  pdf:      "text-red-500",
  contact:  "text-pink-500",
  list:     "text-teal-500",
};

const BLOCK_BG: Record<string, string> = {
  richtext: "bg-blue-500/10",
  todo:     "bg-green-500/10",
  calendar: "bg-purple-500/10",
  photo:    "bg-orange-500/10",
  pdf:      "bg-red-500/10",
  contact:  "bg-pink-500/10",
  list:     "bg-teal-500/10",
};

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary not-italic rounded-[2px] font-medium px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface InstanceSearchProps {
  instanceId: number;
  onNavigate: (blockId: number) => void;
}

export function InstanceSearch({ instanceId, onNavigate }: InstanceSearchProps) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [isOpen, setIsOpen]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const containerRef  = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    setActiveIdx(-1);
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `${BASE_URL}/api/instances/${instanceId}/search?q=${encodeURIComponent(query)}`
        );
        const data: SearchHit[] = await r.json();
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query, instanceId]);

  // Click-outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    }
  }

  function handleSelect(hit: SearchHit) {
    setIsOpen(false);
    onNavigate(hit.blockId);
  }

  function clear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  // Group results by blockId for display
  const grouped: { blockId: number; blockType: string; blockTitle: string | null; hits: SearchHit[] }[] = [];
  const seenBlocks = new Map<number, number>();
  for (const hit of results) {
    if (!seenBlocks.has(hit.blockId)) {
      seenBlocks.set(hit.blockId, grouped.length);
      grouped.push({ blockId: hit.blockId, blockType: hit.blockType, blockTitle: hit.blockTitle, hits: [] });
    }
    grouped[seenBlocks.get(hit.blockId)!].hits.push(hit);
  }

  // Flat index for keyboard nav
  const flatHits = results;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className={cn(
        "flex items-center gap-2.5 bg-muted/40 border rounded-xl px-3 py-2.5 transition-colors",
        isOpen || document.activeElement === inputRef.current
          ? "border-primary/50 bg-background ring-1 ring-primary/20"
          : "border-border hover:border-border/80"
      )}>
        {loading ? (
          <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin shrink-0" />
        ) : (
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Search across all blocks in this instance…"
          className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground min-w-0"
        />
        {query && (
          <button
            onClick={clear}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-[360px] overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              No results for <span className="font-medium text-foreground">"{query}"</span>
            </div>
          ) : (
            <div className="py-1.5">
              {grouped.map((group) => {
                const Icon = BLOCK_ICONS[group.blockType] ?? FileText;
                return (
                  <div key={group.blockId}>
                    {/* Block header label */}
                    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                      <div className={cn("p-1 rounded", BLOCK_BG[group.blockType] ?? "bg-muted/40")}>
                        <Icon className={cn("w-3 h-3", BLOCK_COLORS[group.blockType] ?? "text-muted-foreground")} />
                      </div>
                      <span className="text-xs font-semibold text-foreground truncate">
                        {group.blockTitle ?? `Untitled ${group.blockType}`}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {group.hits.length} match{group.hits.length !== 1 ? "es" : ""}
                      </span>
                    </div>

                    {/* Individual hits within the block */}
                    {group.hits.map((hit, hitIdx) => {
                      const flatIdx = flatHits.indexOf(hit);
                      return (
                        <button
                          key={hitIdx}
                          onClick={() => handleSelect(hit)}
                          className={cn(
                            "w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors",
                            flatIdx === activeIdx
                              ? "bg-primary/10"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 mt-0.5 whitespace-nowrap">
                            {hit.matchType}
                          </span>
                          <span className="text-sm text-foreground/80 leading-snug line-clamp-2">
                            <Highlight text={hit.snippet} query={query} />
                          </span>
                        </button>
                      );
                    })}

                    {/* Divider between blocks */}
                    <div className="mx-3 border-b border-border/40 mt-1" />
                  </div>
                );
              })}
              <div className="px-3 pt-1 pb-1.5 text-[11px] text-muted-foreground text-right">
                {results.length} result{results.length !== 1 ? "s" : ""} · click to jump to block
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

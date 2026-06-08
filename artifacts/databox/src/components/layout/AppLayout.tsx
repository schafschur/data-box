import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListCategories } from "@workspace/api-client-react";
import { Library, Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchBar } from "./SearchBar";

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });
  const toggle = () => setCollapsed(c => {
    const next = !c;
    try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
    return next;
  });
  return [collapsed, toggle] as const;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: categories } = useListCategories();
  const [collapsed, toggle] = useSidebarCollapsed();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className={cn(
        "hidden md:flex flex-col flex-shrink-0 border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 overflow-hidden",
        collapsed ? "w-16" : "w-64",
      )}>

        {/* Logo row */}
        <div className={cn(
          "flex items-center gap-3 flex-shrink-0",
          collapsed ? "justify-center p-4" : "justify-between pl-6 pr-3 py-6",
        )}>
          <Link
            href="/"
            className="flex items-center gap-3 font-serif text-2xl tracking-tight font-medium hover:opacity-80 transition-opacity min-w-0"
          >
            <Library className="h-6 w-6 text-primary flex-shrink-0" />
            {!collapsed && <span className="truncate">Databox</span>}
          </Link>

          {!collapsed && (
            <button
              onClick={toggle}
              title="Collapse sidebar"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors flex-shrink-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="flex justify-center pb-2 flex-shrink-0">
            <button
              onClick={toggle}
              title="Expand sidebar"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Search — hidden when collapsed */}
        {!collapsed && <SearchBar />}

        {/* Nav */}
        <nav className={cn(
          "flex-1 py-2 space-y-6 overflow-y-auto",
          collapsed ? "px-2" : "px-4",
        )}>
          {/* Overview */}
          <div>
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                collapsed && "justify-center",
                location === "/"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <Home className="h-4 w-4 flex-shrink-0" />
              {!collapsed && "Overview"}
            </Link>
          </div>

          {/* Categories */}
          <div>
            {!collapsed && (
              <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Categories
              </h4>
            )}
            <div className="space-y-1">
              {categories?.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    collapsed && "justify-center",
                    location.startsWith(`/categories/${cat.id}`)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || "var(--primary)" }}
                  />
                  {!collapsed && <span className="truncate">{cat.name}</span>}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <aside className="md:hidden w-full border-b border-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4">
          <Link href="/" className="flex items-center gap-3 font-serif text-2xl tracking-tight font-medium hover:opacity-80 transition-opacity">
            <Library className="h-6 w-6 text-primary" />
            <span>Databox</span>
          </Link>
        </div>

        <SearchBar />

        <nav className="px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0",
                location === "/"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <Home className="h-4 w-4" />
              Overview
            </Link>
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.id}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors flex-shrink-0",
                  location.startsWith(`/categories/${cat.id}`)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cat.color || "var(--primary)" }}
                />
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

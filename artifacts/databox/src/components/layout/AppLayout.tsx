import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListCategories, getListInstancesQueryKey } from "@workspace/api-client-react";
import { Library, Home, CalendarDays, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchBar } from "./SearchBar";
import { DragProvider, useDrag } from "@/contexts/DragContext";
import { useQueryClient } from "@tanstack/react-query";

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

function AppLayoutInner({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: categories } = useListCategories();
  const [collapsed, toggle] = useSidebarCollapsed();
  const { dragging, setDragging } = useDrag();
  const [overCategoryId, setOverCategoryId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const isDropTarget = (catId: number) =>
    !!dragging && dragging.fromCategoryId !== catId;

  const handleDragOver = (e: React.DragEvent, categoryId: number) => {
    if (!isDropTarget(categoryId)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCategoryId !== categoryId) setOverCategoryId(categoryId);
  };

  const handleDragLeave = (e: React.DragEvent, categoryId: number) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setOverCategoryId(prev => (prev === categoryId ? null : prev));
    }
  };

  const handleDrop = async (e: React.DragEvent, targetCategoryId: number) => {
    e.preventDefault();
    setOverCategoryId(null);
    if (!dragging || dragging.fromCategoryId === targetCategoryId) return;
    const { instanceId, fromCategoryId } = dragging;
    setDragging(null);
    try {
      await fetch(`/api/instances/${instanceId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: targetCategoryId }),
      });
      queryClient.invalidateQueries({ queryKey: getListInstancesQueryKey(fromCategoryId) });
      queryClient.invalidateQueries({ queryKey: getListInstancesQueryKey(targetCategoryId) });
    } catch (err) {
      console.error("Failed to move instance:", err);
    }
  };

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
          {/* Overview + Calendar */}
          <div className="space-y-1">
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
            <Link
              href="/calendar"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                collapsed && "justify-center",
                location === "/calendar"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarDays className="h-4 w-4 flex-shrink-0" />
              {!collapsed && "Calendar"}
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
              {categories?.map((cat) => {
                const canDrop = isDropTarget(cat.id);
                const isOver = overCategoryId === cat.id;
                return (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.id}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all relative",
                      collapsed && "justify-center",
                      !canDrop && !isOver && (
                        location.startsWith(`/categories/${cat.id}`)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
                      ),
                      canDrop && !isOver && "text-muted-foreground hover:text-foreground",
                    )}
                    style={
                      isOver && canDrop
                        ? {
                            boxShadow: `inset 0 0 0 2px ${cat.color || "var(--primary)"}`,
                            backgroundColor: `${cat.color}18`,
                          }
                        : canDrop
                          ? { outline: "none" }
                          : undefined
                    }
                    onDragOver={(e: React.DragEvent) => handleDragOver(e, cat.id)}
                    onDragLeave={(e: React.DragEvent) => handleDragLeave(e, cat.id)}
                    onDrop={(e: React.DragEvent) => handleDrop(e, cat.id)}
                  >
                    <div
                      className={cn(
                        "rounded-full flex-shrink-0 transition-all duration-150",
                        isOver && canDrop ? "w-3.5 h-3.5" : "w-2.5 h-2.5",
                      )}
                      style={{ backgroundColor: cat.color || "var(--primary)" }}
                    />
                    {!collapsed && (
                      <span className="truncate">{cat.name}</span>
                    )}
                    {collapsed && isOver && canDrop && (
                      <span
                        className="absolute left-full ml-2 whitespace-nowrap text-xs font-medium px-2 py-1 rounded-md shadow-md z-50 pointer-events-none"
                        style={{
                          backgroundColor: cat.color || "var(--primary)",
                          color: "#fff",
                        }}
                      >
                        {cat.name}
                      </span>
                    )}
                  </Link>
                );
              })}
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
            <Link
              href="/calendar"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0",
                location === "/calendar"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
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

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <DragProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </DragProvider>
  );
}

import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useListCategories } from "@workspace/api-client-react";
import { Library, Folder, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: categories } = useListCategories();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 font-serif text-2xl tracking-tight font-medium hover:opacity-80 transition-opacity">
            <Library className="h-6 w-6 text-primary" />
            <span>Databox</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-6 overflow-y-auto">
          <div>
            <Link 
              href="/"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/" 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Home className="h-4 w-4" />
              Overview
            </Link>
          </div>

          <div>
            <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Categories
            </h4>
            <div className="space-y-1">
              {categories?.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    location.startsWith(`/categories/${cat.id}`)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: cat.color || 'var(--primary)' }}
                  />
                  <span className="truncate">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
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

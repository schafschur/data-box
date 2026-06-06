import { useListCategories } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreateCategoryDialog } from "@/components/forms/CreateCategoryDialog";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Folder } from "lucide-react";

export function Home() {
  const { data: categories, isLoading } = useListCategories();

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-serif tracking-tight text-foreground">Overview</h1>
            <p className="text-muted-foreground mt-2 text-lg">Your personal data workspace.</p>
          </div>
          <CreateCategoryDialog />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : categories?.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-lg bg-card/50">
            <h3 className="text-xl font-serif text-muted-foreground mb-4">No categories yet</h3>
            <CreateCategoryDialog />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories?.map((cat) => (
              <Link key={cat.id} href={`/categories/${cat.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group hover-elevate">
                  <CardHeader className="relative">
                    <div 
                      className="absolute top-6 right-6 w-3 h-3 rounded-full opacity-50 group-hover:opacity-100 transition-opacity" 
                      style={{ backgroundColor: cat.color || 'var(--primary)' }}
                    />
                    <CardTitle className="font-serif text-xl flex items-center gap-2">
                      <Folder className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      {cat.name}
                    </CardTitle>
                    {cat.description && (
                      <CardDescription className="text-sm mt-2 line-clamp-2">
                        {cat.description}
                      </CardDescription>
                    )}
                    <div className="text-xs font-medium text-muted-foreground mt-4 uppercase tracking-wider">
                      {cat.instanceCount} {cat.instanceCount === 1 ? 'instance' : 'instances'}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

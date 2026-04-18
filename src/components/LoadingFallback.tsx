import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading fallback "premium" : skeleton plutôt qu'un spinner.
 * Donne une impression de fluidité native pendant les transitions
 * de routes lazy-loadées.
 */
export const LoadingFallback = () => {
  return (
    <div className="min-h-screen bg-background p-4 auth-loading-screen">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Hero card skeleton */}
      <Skeleton className="h-32 w-full rounded-2xl mb-4" />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      {/* Content blocks */}
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>

      {/* Bottom nav placeholder */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/80 backdrop-blur-sm border-t border-border/50">
        <div className="flex justify-around">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

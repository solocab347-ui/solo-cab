/**
 * LIST VIRTUALIZER - Virtualisation pour grandes listes
 * Rend uniquement les éléments visibles pour améliorer les performances
 */

import React, { useRef, useState, useEffect, useCallback } from "react";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // Nombre d'items à rendre hors viewport
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = "",
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculer les indices visibles
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook pour lazy loading au scroll
 */
export function useInfiniteScroll(
  loadMore: () => void,
  hasMore: boolean,
  threshold = 200
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;

    const options = {
      root: null,
      rootMargin: `${threshold}px`,
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        loadMore();
      }
    }, options);

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, threshold]);

  return sentinelRef;
}

/**
 * Hook pour pagination avec cache
 */
export function usePaginatedData<T>(
  fetchFn: (page: number) => Promise<T[]>,
  pageSize: number
) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cache = useRef<Map<number, T[]>>(new Map());

  const loadPage = useCallback(
    async (pageNum: number) => {
      // Vérifier le cache
      if (cache.current.has(pageNum)) {
        const cachedData = cache.current.get(pageNum)!;
        setData((prev) => [...prev, ...cachedData]);
        return;
      }

      setLoading(true);
      try {
        const newData = await fetchFn(pageNum);
        
        if (newData.length < pageSize) {
          setHasMore(false);
        }

        // Mettre en cache
        cache.current.set(pageNum, newData);
        
        setData((prev) => [...prev, ...newData]);
      } catch (error) {
        console.error("Error loading page:", error);
      } finally {
        setLoading(false);
      }
    },
    [fetchFn, pageSize]
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPage(nextPage);
    }
  }, [page, loading, hasMore, loadPage]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    cache.current.clear();
    loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    loadPage(1);
  }, []);

  return {
    data,
    loading,
    hasMore,
    loadMore,
    reset,
  };
}

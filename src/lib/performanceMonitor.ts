/**
 * Performance Monitor — Real-time metrics collection for SoloCab
 * Tracks API response times, page loads, and Core Web Vitals
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'api' | 'navigation' | 'interaction' | 'resource';
  metadata?: Record<string, string>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 500;
  private apiTimings: Map<string, number[]> = new Map();

  // Track API call duration
  trackApiCall(endpoint: string, durationMs: number) {
    const key = this.normalizeEndpoint(endpoint);
    const timings = this.apiTimings.get(key) || [];
    timings.push(durationMs);
    if (timings.length > 50) timings.shift();
    this.apiTimings.set(key, timings);

    this.addMetric({
      name: key,
      value: durationMs,
      timestamp: Date.now(),
      category: 'api',
    });
  }

  // Track page navigation
  trackNavigation(route: string, durationMs: number) {
    this.addMetric({
      name: route,
      value: durationMs,
      timestamp: Date.now(),
      category: 'navigation',
    });
  }

  // Get summary stats
  getApiStats() {
    const stats: Record<string, { avg: number; p95: number; count: number; slow: boolean }> = {};
    this.apiTimings.forEach((timings, key) => {
      const sorted = [...timings].sort((a, b) => a - b);
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
      stats[key] = { avg: Math.round(avg), p95: Math.round(p95), count: sorted.length, slow: avg > 500 };
    });
    return stats;
  }

  getSlowApis(thresholdMs = 500) {
    const stats = this.getApiStats();
    return Object.entries(stats)
      .filter(([, s]) => s.avg > thresholdMs)
      .sort((a, b) => b[1].avg - a[1].avg);
  }

  getNavigationStats() {
    const navMetrics = this.metrics.filter(m => m.category === 'navigation');
    const byRoute: Record<string, number[]> = {};
    navMetrics.forEach(m => {
      (byRoute[m.name] ||= []).push(m.value);
    });
    return Object.entries(byRoute).map(([route, timings]) => ({
      route,
      avg: Math.round(timings.reduce((a, b) => a + b, 0) / timings.length),
      count: timings.length,
    }));
  }

  getWebVitals(): Promise<{ lcp?: number; fid?: number; cls?: number }> {
    return new Promise(resolve => {
      const vitals: { lcp?: number; fid?: number; cls?: number } = {};
      
      if (typeof PerformanceObserver === 'undefined') {
        resolve(vitals);
        return;
      }

      let resolved = false;
      const finish = () => {
        if (!resolved) { resolved = true; resolve(vitals); }
      };

      try {
        // LCP
        const lcpObs = new PerformanceObserver(list => {
          const entries = list.getEntries();
          if (entries.length) vitals.lcp = Math.round(entries[entries.length - 1].startTime);
        });
        lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });

        // CLS
        const clsObs = new PerformanceObserver(list => {
          let cls = 0;
          list.getEntries().forEach((entry: any) => { if (!entry.hadRecentInput) cls += entry.value; });
          vitals.cls = Math.round(cls * 1000) / 1000;
        });
        clsObs.observe({ type: 'layout-shift', buffered: true });
      } catch { /* unsupported */ }

      // Resolve after 1s max
      setTimeout(finish, 1000);
    });
  }

  getOverallHealth(): 'excellent' | 'good' | 'degraded' | 'critical' {
    const stats = this.getApiStats();
    const values = Object.values(stats);
    if (values.length === 0) return 'good';
    
    const avgAll = values.reduce((sum, s) => sum + s.avg, 0) / values.length;
    const slowCount = values.filter(s => s.slow).length;
    
    if (avgAll < 200 && slowCount === 0) return 'excellent';
    if (avgAll < 400 && slowCount <= 2) return 'good';
    if (avgAll < 800 || slowCount <= 5) return 'degraded';
    return 'critical';
  }

  clear() {
    this.metrics = [];
    this.apiTimings.clear();
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  private normalizeEndpoint(url: string): string {
    try {
      const u = new URL(url);
      // Extract table name from Supabase REST path
      const match = u.pathname.match(/\/rest\/v1\/(\w+)/);
      if (match) return `db/${match[1]}`;
      const fnMatch = u.pathname.match(/\/functions\/v1\/(.+)/);
      if (fnMatch) return `fn/${fnMatch[1]}`;
      return u.pathname.slice(0, 50);
    } catch {
      return url.slice(0, 50);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-instrument fetch to track API timings
const originalFetch = window.fetch;
window.fetch = async function instrumentedFetch(...args) {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
  
  // Only track Supabase calls
  if (!url.includes('supabase.co')) {
    return originalFetch.apply(this, args);
  }

  const start = performance.now();
  try {
    const response = await originalFetch.apply(this, args);
    performanceMonitor.trackApiCall(url, performance.now() - start);
    return response;
  } catch (err) {
    performanceMonitor.trackApiCall(url, performance.now() - start);
    throw err;
  }
};

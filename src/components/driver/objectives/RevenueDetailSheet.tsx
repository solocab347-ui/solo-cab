import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Car, Loader2 } from 'lucide-react';

interface RevenueDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  totalRevenue: number;
  totalTarget: number;
}

interface DetailRow {
  label: string;
  revenue: number;
  courses: number;
  sort_key?: string | number;
}

const PERIOD_TITLES: Record<string, string> = {
  daily: "Détail du jour (par heure)",
  weekly: "Détail de la semaine (par jour)",
  monthly: "Détail du mois (par semaine)",
  yearly: "Détail de l'année (par mois)",
};

export function RevenueDetailSheet({ open, onOpenChange, driverId, period, totalRevenue, totalTarget }: RevenueDetailSheetProps) {
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !driverId) return;
    
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_driver_revenue_details', {
          p_driver_id: driverId,
          p_period: period,
        });
        if (error) throw error;
        setDetails((data as DetailRow[]) || []);
      } catch (e) {
        console.error('Error fetching revenue details:', e);
        setDetails([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [open, driverId, period]);

  const maxRevenue = Math.max(...details.map(d => d.revenue), 1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            {PERIOD_TITLES[period]}
          </SheetTitle>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-green-500">{totalRevenue.toFixed(0)}€ / {totalTarget}€</span>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : details.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune donnée pour cette période
          </div>
        ) : (
          <div className="space-y-1.5 overflow-y-auto max-h-[55vh] pr-1">
            {details.map((row, i) => {
              const pct = maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0;
              const hasRevenue = row.revenue > 0;
              
              return (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${hasRevenue ? 'bg-muted/50' : ''}`}>
                  <span className="text-xs font-medium w-20 shrink-0 text-muted-foreground">
                    {row.label}
                  </span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-green-500/70 to-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <span className={`text-xs font-bold ${hasRevenue ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {row.revenue.toFixed(0)}€
                    </span>
                    {row.courses > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                        <Car className="w-2.5 h-2.5" />
                        {row.courses}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

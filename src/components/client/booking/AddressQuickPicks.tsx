import { Button } from '@/components/ui/button';
import { Home, Briefcase, Star, History, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedAddress, RecentAddress } from '@/hooks/useClientAddresses';

export interface QuickAddress {
  address: string;
  latitude: number | null;
  longitude: number | null;
  label?: string;
  source: 'saved' | 'recent';
  type?: 'home' | 'work' | 'other';
}

interface AddressQuickPicksProps {
  saved: SavedAddress[];
  recent: RecentAddress[];
  onSelect: (a: QuickAddress) => void;
  /** Hide entries already matching this address (case-insensitive) */
  excludeAddress?: string;
  /** Compact label shown above the list */
  title?: string;
}

const typeIcon = (type?: string) => {
  if (type === 'home') return Home;
  if (type === 'work') return Briefcase;
  return Star;
};

export function AddressQuickPicks({
  saved,
  recent,
  onSelect,
  excludeAddress,
  title = 'Adresses rapides',
}: AddressQuickPicksProps) {
  const norm = (s?: string | null) => (s || '').trim().toLowerCase();
  const excluded = norm(excludeAddress);

  const savedFiltered = saved.filter((s) => norm(s.address) !== excluded);
  // Avoid duplicating saved addresses inside the recent list
  const savedSet = new Set(saved.map((s) => norm(s.address)));
  const recentFiltered = recent.filter(
    (r) => norm(r.address) !== excluded && !savedSet.has(norm(r.address))
  );

  if (savedFiltered.length === 0 && recentFiltered.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Star className="h-3 w-3 text-primary" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {savedFiltered.map((s) => {
          const Icon = typeIcon(s.address_type);
          return (
            <Button
              key={`saved-${s.id}`}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-auto py-1.5 px-2.5 text-xs gap-1.5 max-w-full',
                'border-primary/30 hover:bg-primary/10 hover:border-primary/50'
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect({
                  address: s.address,
                  latitude: s.latitude,
                  longitude: s.longitude,
                  label: s.label,
                  source: 'saved',
                  type: s.address_type,
                });
              }}
            >
              <Icon className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate font-medium">{s.label}</span>
            </Button>
          );
        })}

        {recentFiltered.slice(0, 5).map((r, i) => (
          <Button
            key={`recent-${i}`}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto py-1.5 px-2.5 text-xs gap-1.5 max-w-full border-border/60"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect({
                address: r.address,
                latitude: r.latitude,
                longitude: r.longitude,
                source: 'recent',
              });
            }}
            title={r.address}
          >
            <History className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[140px]">
              {r.address.split(',')[0]}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}

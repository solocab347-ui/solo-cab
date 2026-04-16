/**
 * Navigation mobile premium - Design glassmorphism avec animations
 * Menu restructuré : 20 → 12 onglets avec regroupements logiques
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, Home, Users, Car, MessageSquare, 
  Wallet, UserCircle, Wrench, BarChart3, Megaphone,
  Handshake, Crown, HelpCircle, ChevronRight, Lock,
  Sparkles, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";
import { useDriverPremium } from "@/hooks/useDriverPremium";
import { toast } from "sonner";

interface MobileDriverNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  partnershipNotificationCount: number;
  isFleetDriver?: boolean;
}

interface NavItem {
  value: string;
  icon: any;
  label: string;
  description?: string;
  badge?: number;
  premium?: boolean;
  accent: string; // HSL accent color
}

export const MobileDriverNav = ({
  activeTab,
  onTabChange,
  partnershipNotificationCount,
  isFleetDriver = false,
}: MobileDriverNavProps) => {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const { isFree } = useDriverPremium();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setAnimateIn(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  const handleSelect = (value: string, isPremiumItem?: boolean) => {
    if (isPremiumItem && isFree) {
      onTabChange("subscription");
      setIsOpen(false);
      toast.info("Fonctionnalité Premium", {
        description: "Passez à Premium pour accéder à cette fonctionnalité — 19,99€/mois"
      });
      return;
    }
    onTabChange(value);
    setIsOpen(false);
  };

  // ============ STRUCTURE 12 ONGLETS ============
  
  const primaryItems: NavItem[] = [
    { value: "home", icon: Home, label: "Accueil", description: "Tableau de bord", accent: "142 76% 36%" },
    { value: "courses", icon: Car, label: "Courses", description: "Réservations & planning", accent: "262 83% 58%" },
    { value: "clients", icon: Users, label: "Clients", description: "Votre clientèle", accent: "217 91% 60%" },
    { value: "messages", icon: MessageSquare, label: "Messages", description: "Conversations", accent: "189 94% 43%" },
  ];

  const businessItems: NavItem[] = [
    { value: "finances", icon: Wallet, label: "Finances", description: "Devis, factures & paiements", accent: "38 92% 50%" },
    { value: "mon-profil", icon: UserCircle, label: "Mon Profil", description: "Identité, tarifs & documents", accent: "217 91% 60%" },
    { value: "performance", icon: BarChart3, label: "Performance", description: "Stats, objectifs & rentabilité", accent: "262 83% 58%", premium: true },
    { value: "outils", icon: Wrench, label: "Outils", description: "Calculateur, QR & prospection", accent: "330 81% 60%" },
  ];

  const networkItems: NavItem[] = [
    { value: "marketing", icon: Megaphone, label: "Marketing", description: "Campagnes & promotions", accent: "0 84% 60%", premium: true },
    { 
      value: "sharing", icon: Handshake, label: "Partenariats", 
      description: "Réseau & partage de courses", accent: "38 92% 50%", premium: true,
      badge: partnershipNotificationCount > 0 ? partnershipNotificationCount : undefined
    },
  ];

  const systemItems: NavItem[] = [
    { value: "subscription", icon: Crown, label: "Abonnement", description: "Gérer votre plan", accent: "262 83% 58%" },
    { value: "aide", icon: HelpCircle, label: "Aide", description: "Feedback & support", accent: "142 76% 36%" },
  ];

  // Remove documents from mon-profil group if fleet driver
  // (handled inside the merged tab itself)

  const allItems = [...primaryItems, ...businessItems, ...networkItems, ...systemItems];
  const activeItem = allItems.find(item => item.value === activeTab);
  // Map old tab values to new grouped ones for display
  const displayItem = activeItem || allItems.find(item => {
    if (['devis', 'factures', 'encaisser'].includes(activeTab)) return item.value === 'finances';
    if (['profile', 'settings', 'documents', 'tarification'].includes(activeTab)) return item.value === 'mon-profil';
    if (['statistics', 'objectives', 'profitability'].includes(activeTab)) return item.value === 'performance';
    if (['calculator', 'qrcode', 'prospection'].includes(activeTab)) return item.value === 'outils';
    if (['campaigns'].includes(activeTab)) return item.value === 'marketing';
    if (['feedback'].includes(activeTab)) return item.value === 'aide';
    return false;
  }) || primaryItems[0];

  const ActiveIcon = displayItem.icon;

  const NavButton = ({ item, index }: { item: NavItem; index: number }) => {
    const isActive = activeTab === item.value || 
      (item.value === 'finances' && ['devis', 'factures', 'encaisser', 'finances'].includes(activeTab)) ||
      (item.value === 'mon-profil' && ['profile', 'settings', 'documents', 'tarification', 'mon-profil'].includes(activeTab)) ||
      (item.value === 'performance' && ['statistics', 'objectives', 'profitability', 'performance'].includes(activeTab)) ||
      (item.value === 'outils' && ['calculator', 'qrcode', 'prospection', 'outils'].includes(activeTab)) ||
      (item.value === 'marketing' && ['campaigns', 'marketing'].includes(activeTab)) ||
      (item.value === 'aide' && ['feedback', 'aide'].includes(activeTab));
    
    const isPremiumLocked = item.premium && isFree;
    const Icon = item.icon;
    
    return (
      <button
        onClick={() => handleSelect(item.value, item.premium)}
        className={cn(
          "group relative w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 ease-out touch-manipulation",
          "active:scale-[0.97]",
          isActive && !isPremiumLocked
            ? "bg-foreground/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_4px_12px_-2px_rgba(0,0,0,0.15)]"
            : "hover:bg-foreground/[0.04]"
        )}
        style={{
          transitionDelay: animateIn ? `${index * 35}ms` : '0ms',
          opacity: animateIn ? 1 : 0,
          transform: animateIn ? 'translateX(0)' : 'translateX(-12px)',
        }}
      >
        {/* Icon with glow */}
        <div 
          className={cn(
            "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0",
            isActive && !isPremiumLocked
              ? "shadow-[0_0_20px_-4px_hsla(var(--accent-color),0.5)]"
              : "bg-foreground/[0.06]"
          )}
          style={{
            '--accent-color': item.accent,
            background: isActive && !isPremiumLocked 
              ? `linear-gradient(135deg, hsl(${item.accent} / 0.9), hsl(${item.accent} / 0.6))` 
              : undefined,
          } as any}
        >
          <Icon className={cn(
            "w-5 h-5 transition-colors duration-300",
            isActive && !isPremiumLocked ? "text-white" : "text-muted-foreground group-hover:text-foreground"
          )} />
          
          {/* Subtle shine on active */}
          {isActive && !isPremiumLocked && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Label & description */}
        <div className="flex-1 min-w-0 text-left">
          <span className={cn(
            "block text-sm font-semibold tracking-tight transition-colors duration-300",
            isActive && !isPremiumLocked ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
          )}>
            {item.label}
          </span>
          {item.description && (
            <span className="block text-[11px] text-muted-foreground/70 truncate mt-0.5">
              {item.description}
            </span>
          )}
        </div>

        {/* Badges */}
        {isPremiumLocked && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Lock className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-medium text-amber-500">Pro</span>
          </div>
        )}
        {item.premium && !isFree && (
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
        )}
        {item.badge && item.badge > 0 && (
          <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-destructive-foreground">{item.badge}</span>
          </div>
        )}

        {/* Active indicator bar */}
        {isActive && !isPremiumLocked && (
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full transition-all duration-300"
            style={{ background: `hsl(${item.accent})` }}
          />
        )}

        <ChevronRight className={cn(
          "w-4 h-4 flex-shrink-0 transition-all duration-300",
          isActive && !isPremiumLocked ? "text-foreground/40 translate-x-0.5" : "text-foreground/15 group-hover:text-foreground/30"
        )} />
      </button>
    );
  };

  const SectionLabel = ({ label, delay }: { label: string; delay: number }) => (
    <div 
      className="px-4 pt-5 pb-1.5 transition-all duration-300"
      style={{
        transitionDelay: animateIn ? `${delay}ms` : '0ms',
        opacity: animateIn ? 1 : 0,
      }}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
        {label}
      </span>
    </div>
  );

  let itemIndex = 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            "md:hidden flex items-center gap-2 h-10 px-3 rounded-xl",
            "bg-foreground/[0.06] hover:bg-foreground/[0.1] border border-foreground/[0.08]",
            "backdrop-blur-sm transition-all duration-200 active:scale-[0.96] touch-manipulation"
          )}
        >
          <Menu className="w-5 h-5 text-foreground/70" />
          <div className="w-px h-4 bg-foreground/10" />
          <ActiveIcon className="w-4 h-4 text-foreground/70" />
          <span className="text-sm font-medium text-foreground/80 max-w-24 truncate">
            {displayItem.label}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className={cn(
          "w-[88vw] max-w-[340px] p-0 overflow-hidden border-0",
          "bg-gradient-to-b from-card via-card to-card/95"
        )}
      >
        {/* Header with frosted glass */}
        <div className="relative px-5 pt-5 pb-4">
          {/* Decorative gradient blob */}
          <div 
            className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{ background: `radial-gradient(circle, hsl(${displayItem.accent} / 0.4), transparent)` }}
          />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-bold text-sm">SC</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">SoloCab</h2>
                <p className="text-[11px] text-muted-foreground/70">Navigation chauffeur</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-xl hover:bg-foreground/[0.06] text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Separator with glow */}
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        </div>
        
        {/* Scrollable nav content */}
        <div 
          className="overflow-y-auto overscroll-contain px-2"
          style={{ 
            height: "calc(100vh - 100px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 20px)"
          }}
        >
          {/* Principal */}
          <SectionLabel label="Principal" delay={0} />
          <div className="space-y-0.5">
            {primaryItems.map(item => (
              <NavButton key={item.value} item={item} index={itemIndex++} />
            ))}
          </div>

          {/* Gestion */}
          <SectionLabel label="Gestion" delay={primaryItems.length * 35} />
          <div className="space-y-0.5">
            {businessItems.map(item => (
              <NavButton key={item.value} item={item} index={itemIndex++} />
            ))}
          </div>

          {/* Réseau */}
          <SectionLabel label="Réseau" delay={(primaryItems.length + businessItems.length) * 35} />
          <div className="space-y-0.5">
            {networkItems.map(item => (
              <NavButton key={item.value} item={item} index={itemIndex++} />
            ))}
          </div>

          {/* Système */}
          <SectionLabel label="Système" delay={(primaryItems.length + businessItems.length + networkItems.length) * 35} />
          <div className="space-y-0.5 pb-4">
            {systemItems.map(item => (
              <NavButton key={item.value} item={item} index={itemIndex++} />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileDriverNav;

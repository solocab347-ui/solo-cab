/**
 * Navigation mobile optimisée pour iOS
 * Navigation verticale avec sections collapsibles
 * Premium gating: les items premium redirigent vers l'onglet subscription si free
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Menu, Home, Users, Car, MessageSquare, FileText, CreditCard,
  FolderOpen, Calendar, Calculator, QrCode,
  Megaphone, PieChart, Sparkles, Lightbulb, TrendingUp,
  Globe, BarChart3, Handshake, Settings, ChevronDown, Wrench, Target, Clock, Crown, Lock
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
  shortLabel?: string;
  gradient?: string;
  badge?: number;
  comingSoon?: boolean;
  premium?: boolean;
}

interface NavGroup {
  title: string;
  icon: any;
  items: NavItem[];
  gradient: string;
}

export const MobileDriverNav = ({
  activeTab,
  onTabChange,
  partnershipNotificationCount,
  isFleetDriver = false,
}: MobileDriverNavProps) => {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["main"]);
  const { isFree } = useDriverPremium();

  const handleSelect = (value: string, isPremiumItem?: boolean) => {
    // Si l'item est premium et que l'utilisateur est free, rediriger vers subscription
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

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  // Items principaux (toujours visibles)
  const mainItems: NavItem[] = [
    { value: "home", icon: Home, label: t('driverDashboard.menu.home'), gradient: "from-green-500 to-emerald-600" },
    { value: "clients", icon: Users, label: t('driverDashboard.menu.myClients'), gradient: "from-blue-500 to-cyan-600" },
    { value: "courses", icon: Car, label: t('driverDashboard.menu.myRides'), gradient: "from-purple-500 to-pink-600" },
    { value: "messages", icon: MessageSquare, label: t('driverDashboard.menu.messages'), gradient: "from-cyan-500 to-blue-600" },
    { value: "devis", icon: FileText, label: t('driverDashboard.menu.quotes'), gradient: "from-purple-500 to-blue-600" },
    { value: "factures", icon: CreditCard, label: t('driverDashboard.menu.invoices'), gradient: "from-green-500 to-emerald-600" },
  ];

  // Ajouter documents si pas fleet driver
  if (!isFleetDriver) {
    mainItems.push({ value: "documents", icon: FolderOpen, label: t('driverDashboard.menu.documents'), gradient: "from-amber-500 to-orange-600" });
  }

  // Groupes d'outils
  const navGroups: NavGroup[] = [
    {
      title: t('driverDashboard.menu.tools'),
      icon: Wrench,
      gradient: "from-purple-500 to-pink-600",
      items: [
        { value: "planning", icon: Calendar, label: t('driverDashboard.menu.planning'), premium: true },
        { value: "calculator", icon: Calculator, label: t('driverDashboard.menu.calculator') },
        { value: "qrcode", icon: QrCode, label: t('driverDashboard.menu.myQRCode') },
      ],
    },
    {
      title: t('driverDashboard.menu.development'),
      icon: Wrench,
      gradient: "from-blue-500 to-cyan-600",
      items: [
        { value: "objectives", icon: Target, label: t('driverDashboard.menu.objectives'), premium: true },
        { value: "campaigns", icon: Megaphone, label: t('driverDashboard.menu.campaign'), premium: true },
        { value: "profitability", icon: PieChart, label: t('driverDashboard.menu.profitability'), premium: true },
        { value: "prospection", icon: Sparkles, label: t('driverDashboard.menu.prospection'), premium: true },
      ],
    },
  ];

  // Items secondaires
  const secondaryItems: NavItem[] = [
    { value: "feedback", icon: Lightbulb, label: t('driverDashboard.menu.feedback'), gradient: "from-amber-500 to-orange-600" },
    { value: "subscription", icon: TrendingUp, label: t('driverDashboard.menu.subscription'), gradient: "from-purple-500 to-pink-600" },
    { value: "profile", icon: Globe, label: "Profil SoloCab", gradient: "from-blue-500 to-cyan-600" },
    { value: "statistics", icon: BarChart3, label: t('driverDashboard.menu.statistics'), gradient: "from-cyan-500 to-blue-600" },
    { 
      value: "sharing", 
      icon: Handshake, 
      label: t('driverDashboard.menu.partnerships'), 
      gradient: "from-amber-500 to-orange-600",
      premium: true
    },
    { value: "settings", icon: Settings, label: t('driverDashboard.menu.settings'), gradient: "from-gray-500 to-slate-600" },
  ];

  const NavButton = ({ item, onClick }: { item: NavItem; onClick: () => void }) => {
    const isActive = activeTab === item.value;
    const Icon = item.icon;
    const isDisabled = item.comingSoon;
    const isPremiumLocked = item.premium && isFree;
    
    return (
      <button
        onClick={isDisabled ? undefined : onClick}
        disabled={isDisabled}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all touch-manipulation",
          isDisabled 
            ? "opacity-50 cursor-not-allowed bg-muted/20"
            : "active:scale-[0.98]",
          !isDisabled && isActive && !isPremiumLocked
            ? `bg-gradient-to-r ${item.gradient || "from-primary to-accent"} text-primary-foreground shadow-lg`
            : !isDisabled && "bg-muted/30 text-muted-foreground hover:bg-muted/50"
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left font-medium truncate">{item.label}</span>
        {item.premium && isFree && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500/40 text-amber-600 bg-amber-500/10 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Premium
          </Badge>
        )}
        {item.premium && !isFree && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500/40 text-amber-600 bg-amber-500/10 flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Premium
          </Badge>
        )}
        {item.comingSoon && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-muted-foreground/30 text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Bientôt
          </Badge>
        )}
        {!item.comingSoon && !item.premium && item.badge && item.badge > 0 && (
          <Badge className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5">
            {item.badge}
          </Badge>
        )}
      </button>
    );
  };

  // Trouver l'item actif pour l'afficher dans le trigger
  const allItems = [...mainItems, ...navGroups.flatMap(g => g.items), ...secondaryItems];
  const activeItem = allItems.find(item => item.value === activeTab);
  const ActiveIcon = activeItem?.icon || Home;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="md:hidden flex items-center gap-2 bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 touch-manipulation h-10 px-3"
        >
          <Menu className="w-5 h-5" />
          <ActiveIcon className="w-4 h-4" />
          <span className="text-sm font-medium max-w-24 truncate">
            {activeItem?.shortLabel || activeItem?.label || "Menu"}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[85vw] max-w-sm bg-card border-border p-0 overflow-hidden"
      >
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <SheetTitle className="text-foreground text-left">Navigation</SheetTitle>
        </SheetHeader>
        
        <div 
          className="overflow-y-auto overscroll-contain"
          style={{ 
            height: "calc(100vh - 70px)",
            paddingBottom: "env(safe-area-inset-bottom, 20px)"
          }}
        >
          <div className="p-3 space-y-4">
            {/* Items principaux */}
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground px-2 mb-2">Principal</p>
              {mainItems.map(item => (
                <NavButton key={item.value} item={item} onClick={() => handleSelect(item.value, item.premium)} />
              ))}
            </div>

            {/* Groupes d'outils */}
            {navGroups.map(group => (
              <Collapsible 
                key={group.title}
                open={openGroups.includes(group.title)}
                onOpenChange={() => toggleGroup(group.title)}
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all touch-manipulation">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r", group.gradient)}>
                      <group.icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-medium text-foreground">{group.title}</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform",
                    openGroups.includes(group.title) && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5 ml-4 space-y-1.5">
                  {group.items.map(item => (
                    <NavButton key={item.value} item={{ ...item, gradient: group.gradient }} onClick={() => handleSelect(item.value, item.premium)} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Items secondaires */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground px-2 mb-2">Autre</p>
              {secondaryItems.map(item => (
                <NavButton key={item.value} item={item} onClick={() => handleSelect(item.value, item.premium)} />
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileDriverNav;

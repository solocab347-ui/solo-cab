import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Globe, 
  Users, 
  Car, 
  TrendingUp,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoSolocab from "@/assets/logo-solocab.png";

interface FleetDashboardHeaderProps {
  fleetManager: {
    id: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
    status: string;
    show_drivers_in_public_storefront: boolean;
    subscription_status: string | null;
  };
  driversCount: number;
  clientsCount: number;
  userProfile?: {
    full_name: string;
    avatar_url?: string | null;
    profile_photo_url?: string | null;
  } | null;
}

export const FleetDashboardHeader = ({ 
  fleetManager, 
  driversCount, 
  clientsCount,
  userProfile 
}: FleetDashboardHeaderProps) => {
  const avatarUrl = userProfile?.profile_photo_url || userProfile?.avatar_url;
  const initials = (userProfile?.full_name || fleetManager.contact_name || "FM")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getSubscriptionBadge = () => {
    switch (fleetManager.subscription_status) {
      case "active":
        return <Badge className="bg-success/20 text-success border-success/30">Premium</Badge>;
      case "trialing":
        return <Badge className="bg-info/20 text-info border-info/30">Essai</Badge>;
      default:
        return <Badge variant="outline">Standard</Badge>;
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Animated particles effect */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-20 w-40 h-40 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left side - Logo and Manager Info */}
          <div className="flex items-center gap-5">
            {/* Logo SoloCab */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-lg opacity-30 animate-pulse" />
              <div className="relative w-16 h-16 md:w-20 md:h-20 bg-card/80 backdrop-blur-xl rounded-2xl p-2 border border-border/50 shadow-2xl">
                <img 
                  src={logoSolocab} 
                  alt="SoloCab" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Manager Avatar & Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur opacity-40" />
                <Avatar className="relative w-14 h-14 md:w-16 md:h-16 border-2 border-primary/30 shadow-xl">
                  <AvatarImage src={avatarUrl || undefined} alt={fleetManager.contact_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    {fleetManager.company_name}
                  </h1>
                  {getSubscriptionBadge()}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {userProfile?.full_name || fleetManager.contact_name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Quick Stats & Actions */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            {/* Quick Stats Pills */}
            <div className="flex items-center gap-3 bg-card/50 backdrop-blur-xl rounded-full px-4 py-2 border border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Car className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold">{driversCount}</span>
                <span className="text-muted-foreground text-sm hidden sm:inline">chauffeurs</span>
              </div>
              <div className="w-px h-6 bg-border/50" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-success" />
                </div>
                <span className="font-semibold">{clientsCount}</span>
                <span className="text-muted-foreground text-sm hidden sm:inline">clients</span>
              </div>
            </div>

            {/* Public Profile Button */}
            <Button 
              variant="outline"
              className="gap-2 bg-card/50 backdrop-blur-xl border-border/30 hover:bg-primary/10 hover:border-primary/30 transition-all"
              onClick={() => window.open(`/flotte/${fleetManager.id}`, '_blank')}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Profil Public</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Status indicators */}
        {fleetManager.show_drivers_in_public_storefront && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full border border-success/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vitrine publique activée</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

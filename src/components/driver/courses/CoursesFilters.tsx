import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, User, Handshake, Building2, Truck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CourseType, getCourseTypeFilters, COURSE_TYPE_CONFIG } from "@/lib/courseTypeUtils";

export interface CoursesFiltersState {
  searchQuery: string;
  dateFilter: string;
  customStartDate: string;
  customEndDate: string;
  minAmount: string;
  maxAmount: string;
  paymentStatusFilter: string;
  courseTypeFilter: CourseType | "all";
}

interface CoursesFiltersProps {
  filters: CoursesFiltersState;
  onFiltersChange: (filters: Partial<CoursesFiltersState>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export const CoursesFilters = ({ filters, onFiltersChange, onReset, hasActiveFilters }: CoursesFiltersProps) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <>
      {/* BARRE DE RECHERCHE SIMPLE */}
      <Card className="p-4 bg-card/50 backdrop-blur border border-primary/20">
        <div className="space-y-3">
          <Label htmlFor="search" className="text-sm font-semibold">Recherche rapide</Label>
          <Input
            id="search"
            type="text"
            placeholder="Rechercher par nom de client..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="w-full"
          />
        </div>
      </Card>

      {/* FILTRES AVANCÉS */}
      <Card className="p-4 bg-card/50 backdrop-blur border border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtres avancés
            </h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
                  <X className="w-3 h-3 mr-1" />
                  Tout réinitialiser
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-xs"
              >
                {showAdvancedFilters ? "Masquer" : "Afficher"} les filtres
              </Button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="space-y-4 pt-2 border-t border-border">
              {/* FILTRES PAR DATE */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Filtrer par date</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {["all", "today", "week", "month", "last-month", "custom"].map((value) => (
                    <Button
                      key={value}
                      variant={filters.dateFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => onFiltersChange({ dateFilter: value })}
                      className="w-full text-xs"
                    >
                      {value === "all" && "Tout"}
                      {value === "today" && "Aujourd'hui"}
                      {value === "week" && "Semaine"}
                      {value === "month" && "Ce mois"}
                      {value === "last-month" && "Mois dernier"}
                      {value === "custom" && "Personnalisé"}
                    </Button>
                  ))}
                </div>
                {filters.dateFilter === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Du</Label>
                      <Input
                        type="date"
                        value={filters.customStartDate}
                        onChange={(e) => onFiltersChange({ customStartDate: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Au</Label>
                      <Input
                        type="date"
                        value={filters.customEndDate}
                        onChange={(e) => onFiltersChange({ customEndDate: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* FILTRES PAR MONTANT */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Filtrer par montant (€)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minAmount}
                    onChange={(e) => onFiltersChange({ minAmount: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxAmount}
                    onChange={(e) => onFiltersChange({ maxAmount: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* FILTRES PAR STATUT PAIEMENT */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Filtrer par statut de paiement</Label>
                <Select value={filters.paymentStatusFilter} onValueChange={(v) => onFiltersChange({ paymentStatusFilter: v })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="failed">Échoué</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* FILTRES PAR TYPE DE COURSE */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Filtrer par type de course</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {getCourseTypeFilters().map(filter => {
                    const isActive = filters.courseTypeFilter === filter.value;
                    const config = filter.value !== 'all' ? COURSE_TYPE_CONFIG[filter.value as CourseType] : null;
                    
                    return (
                      <Button
                        key={filter.value}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => onFiltersChange({ courseTypeFilter: filter.value as CourseType | "all" })}
                        className={cn(
                          "text-xs flex items-center gap-1",
                          isActive && config && config.bgColor,
                          isActive && config && config.color
                        )}
                      >
                        {filter.value === 'all' && <Filter className="w-3 h-3" />}
                        {filter.value === 'personal' && <User className="w-3 h-3" />}
                        {filter.value === 'partner' && <Handshake className="w-3 h-3" />}
                        {filter.value === 'company' && <Building2 className="w-3 h-3" />}
                        {filter.value === 'fleet' && <Truck className="w-3 h-3" />}
                        <span className="hidden sm:inline">{filter.label.replace('Courses ', '')}</span>
                        <span className="sm:hidden">{filter.value === 'all' ? 'Toutes' : filter.label.replace('Courses ', '').substring(0, 6)}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* RÉSUMÉ DES FILTRES ACTIFS */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground flex flex-wrap gap-1 items-center">
                <span className="font-medium">Filtres actifs:</span>
                {filters.searchQuery && <Badge variant="secondary" className="text-xs">Recherche: {filters.searchQuery}</Badge>}
                {filters.dateFilter !== "all" && filters.dateFilter !== "custom" && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.dateFilter === "today" && "Aujourd'hui"}
                    {filters.dateFilter === "week" && "Cette semaine"}
                    {filters.dateFilter === "month" && "Ce mois"}
                    {filters.dateFilter === "last-month" && "Mois dernier"}
                  </Badge>
                )}
                {filters.dateFilter === "custom" && filters.customStartDate && filters.customEndDate && (
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(filters.customStartDate), "dd/MM/yy", { locale: fr })} - {format(new Date(filters.customEndDate), "dd/MM/yy", { locale: fr })}
                  </Badge>
                )}
                {(filters.minAmount || filters.maxAmount) && (
                  <Badge variant="secondary" className="text-xs">
                    Montant: {filters.minAmount || "0"}€ - {filters.maxAmount || "∞"}€
                  </Badge>
                )}
                {filters.paymentStatusFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Paiement: {filters.paymentStatusFilter === "paid" ? "Payé" : filters.paymentStatusFilter === "pending" ? "En attente" : "Échoué"}
                  </Badge>
                )}
                {filters.courseTypeFilter !== "all" && (
                  <Badge variant="secondary" className={cn("text-xs", COURSE_TYPE_CONFIG[filters.courseTypeFilter].bgColor, COURSE_TYPE_CONFIG[filters.courseTypeFilter].color)}>
                    {COURSE_TYPE_CONFIG[filters.courseTypeFilter].label}
                  </Badge>
                )}
              </p>
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar as CalendarIcon, Filter, X, ChevronDown, RotateCcw } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Driver {
  id: string;
  name: string;
}

interface AdvancedFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: string[];
  onStatusChange: (statuses: string[]) => void;
  availableStatuses: { value: string; label: string }[];
  selectedDrivers: string[];
  onDriversChange: (drivers: string[]) => void;
  drivers: Driver[];
  dateRange: { from: Date | null; to: Date | null };
  onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
  onReset: () => void;
}

const DATE_PRESETS = [
  { label: "Aujourd'hui", getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Cette semaine", getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: "Semaine dernière", getValue: () => ({ from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }) }) },
  { label: "Ce mois", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Mois dernier", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "3 derniers mois", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfDay(new Date()) }) },
];

export const AdvancedFilters = ({
  searchTerm,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  availableStatuses,
  selectedDrivers,
  onDriversChange,
  drivers,
  dateRange,
  onDateRangeChange,
  onReset,
}: AdvancedFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = [
    selectedStatuses.length > 0,
    selectedDrivers.length > 0,
    dateRange.from !== null,
  ].filter(Boolean).length;

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const toggleDriver = (driverId: string) => {
    if (selectedDrivers.includes(driverId)) {
      onDriversChange(selectedDrivers.filter(d => d !== driverId));
    } else {
      onDriversChange([...selectedDrivers, driverId]);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Barre de recherche principale */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par numéro, client, chauffeur..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Filtre par statut (multi-select) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Statuts</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedStatuses.length === 0 
                        ? "Tous les statuts" 
                        : `${selectedStatuses.length} statut(s)`}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3">
                    <div className="space-y-2">
                      {availableStatuses.map((status) => (
                        <div key={status.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`status-${status.value}`}
                            checked={selectedStatuses.includes(status.value)}
                            onCheckedChange={() => toggleStatus(status.value)}
                          />
                          <label 
                            htmlFor={`status-${status.value}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {status.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtre par chauffeur (multi-select) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Chauffeurs</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedDrivers.length === 0 
                        ? "Tous les chauffeurs" 
                        : `${selectedDrivers.length} chauffeur(s)`}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {drivers.map((driver) => (
                        <div key={driver.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`driver-${driver.id}`}
                            checked={selectedDrivers.includes(driver.id)}
                            onCheckedChange={() => toggleDriver(driver.id)}
                          />
                          <label 
                            htmlFor={`driver-${driver.id}`}
                            className="text-sm cursor-pointer flex-1 truncate"
                          >
                            {driver.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtre par date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Période</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yy", { locale: fr })} -{" "}
                            {format(dateRange.to, "dd/MM/yy", { locale: fr })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy", { locale: fr })
                        )
                      ) : (
                        "Toutes les dates"
                      )}
                      <CalendarIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b">
                      <div className="flex flex-wrap gap-1">
                        {DATE_PRESETS.map((preset) => (
                          <Button
                            key={preset.label}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => onDateRangeChange(preset.getValue())}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from || new Date()}
                      selected={{ from: dateRange.from || undefined, to: dateRange.to || undefined }}
                      onSelect={(range) => onDateRangeChange({ 
                        from: range?.from || null, 
                        to: range?.to || null 
                      })}
                      numberOfMonths={1}
                      locale={fr}
                    />
                    {dateRange.from && (
                      <div className="p-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => onDateRangeChange({ from: null, to: null })}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Effacer les dates
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Tags des filtres actifs */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Filtres actifs:</span>
                {selectedStatuses.map(status => {
                  const statusLabel = availableStatuses.find(s => s.value === status)?.label || status;
                  return (
                    <Badge key={status} variant="secondary" className="gap-1">
                      {statusLabel}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => toggleStatus(status)} 
                      />
                    </Badge>
                  );
                })}
                {selectedDrivers.map(driverId => {
                  const driverName = drivers.find(d => d.id === driverId)?.name || "Chauffeur";
                  return (
                    <Badge key={driverId} variant="secondary" className="gap-1">
                      {driverName}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => toggleDriver(driverId)} 
                      />
                    </Badge>
                  );
                })}
                {dateRange.from && (
                  <Badge variant="secondary" className="gap-1">
                    {format(dateRange.from, "dd/MM", { locale: fr })}
                    {dateRange.to && ` - ${format(dateRange.to, "dd/MM", { locale: fr })}`}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => onDateRangeChange({ from: null, to: null })} 
                    />
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-muted-foreground">
                  <RotateCcw className="h-3 w-3" />
                  Réinitialiser
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AdvancedFilters;

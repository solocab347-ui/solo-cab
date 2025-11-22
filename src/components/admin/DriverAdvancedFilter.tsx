import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FilterValues {
  search: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  vehicle: string;
  company: string;
}

interface DriverAdvancedFilterProps {
  onFilterChange: (filters: FilterValues) => void;
  onReset: () => void;
}

const DriverAdvancedFilter = ({ onFilterChange, onReset }: DriverAdvancedFilterProps) => {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    vehicle: "",
    company: "",
  });

  const handleFilterChange = (key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterValues = {
      search: "",
      dateFrom: undefined,
      dateTo: undefined,
      vehicle: "",
      company: "",
    };
    setFilters(resetFilters);
    onReset();
  };

  const hasActiveFilters = 
    filters.search || 
    filters.dateFrom || 
    filters.dateTo || 
    filters.vehicle || 
    filters.company;

  return (
    <Card className="p-4 mb-6">
      {/* Barre de recherche principale */}
      <div className="flex gap-2 items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou téléphone..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "gap-2",
            hasActiveFilters && "border-primary text-primary"
          )}
        >
          <Filter className="w-4 h-4" />
          Filtres avancés
          {hasActiveFilters && (
            <span className="ml-1 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
              {[filters.dateFrom, filters.dateTo, filters.vehicle, filters.company].filter(Boolean).length}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Filtres avancés (repliables) */}
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <Label className="text-xs">Date de début</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? (
                    format(filters.dateFrom, "dd/MM/yyyy", { locale: fr })
                  ) : (
                    "Date de début"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => handleFilterChange("dateFrom", date)}
                  locale={fr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Date de fin</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? (
                    format(filters.dateTo, "dd/MM/yyyy", { locale: fr })
                  ) : (
                    "Date de fin"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => handleFilterChange("dateTo", date)}
                  locale={fr}
                  initialFocus
                  disabled={(date) =>
                    filters.dateFrom ? date < filters.dateFrom : false
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Véhicule</Label>
            <Input
              placeholder="Modèle du véhicule..."
              value={filters.vehicle}
              onChange={(e) => handleFilterChange("vehicle", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Entreprise</Label>
            <Input
              placeholder="Nom de l'entreprise..."
              value={filters.company}
              onChange={(e) => handleFilterChange("company", e.target.value)}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export default DriverAdvancedFilter;

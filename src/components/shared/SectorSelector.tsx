import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, CheckCircle, Circle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitySector {
  city_name: string;
  sector_name: string;
}

interface SectorSelectorProps {
  sectors: CitySector[];
  selectedSectors: string[];
  onToggle: (sectorName: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const SectorSelector = ({
  sectors,
  selectedSectors,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: SectorSelectorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const allSelected = sectors.length > 0 && selectedSectors.length === sectors.length;
  const noneSelected = selectedSectors.length === 0;
  const someSelected = selectedSectors.length > 0 && selectedSectors.length < sectors.length;
  
  // Grouper les secteurs par catégorie (Arrondissements vs autres)
  const arrondissements = sectors.filter(s => s.sector_name.includes('arrondissement'));
  const otherSectors = sectors.filter(s => !s.sector_name.includes('arrondissement'));
  
  const hasArrondissements = arrondissements.length > 0;
  
  // Nombre de secteurs à afficher en mode compact
  const compactLimit = 6;
  const sectorsToShow = isExpanded ? sectors : sectors.slice(0, compactLimit);
  const hasMore = sectors.length > compactLimit;
  
  const selectedCount = selectedSectors.length;
  const totalCount = sectors.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Label className="text-sm">
          Secteurs (optionnel - laisser vide pour toute la ville)
        </Label>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedCount}/{totalCount} sélectionnés
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={allSelected ? onDeselectAll : onSelectAll}
          >
            {allSelected ? (
              <>
                <Circle className="w-3 h-3 mr-1" />
                Tout désélectionner
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Tout sélectionner
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Affichage compact pour Paris et villes avec beaucoup d'arrondissements */}
      {hasArrondissements ? (
        <div className="space-y-3">
          {/* Autres secteurs (Rive Gauche, Rive Droite, etc.) */}
          {otherSectors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {otherSectors.map((sector) => (
                <Badge
                  key={sector.sector_name}
                  variant={selectedSectors.includes(sector.sector_name) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all text-xs px-2 py-0.5",
                    selectedSectors.includes(sector.sector_name) && "ring-1 ring-primary"
                  )}
                  onClick={() => onToggle(sector.sector_name)}
                >
                  {selectedSectors.includes(sector.sector_name) && (
                    <Check className="w-3 h-3 mr-1" />
                  )}
                  {sector.sector_name}
                </Badge>
              ))}
            </div>
          )}

          {/* Grille compacte pour les arrondissements */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {arrondissements.map((sector) => {
              // Extraire le numéro de l'arrondissement
              const match = sector.sector_name.match(/(\d+)/);
              const number = match ? match[1] : sector.sector_name;
              const isSelected = selectedSectors.includes(sector.sector_name);
              
              return (
                <button
                  key={sector.sector_name}
                  type="button"
                  onClick={() => onToggle(sector.sector_name)}
                  className={cn(
                    "flex items-center justify-center h-8 rounded-md text-xs font-medium transition-all",
                    "border hover:border-primary/50",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title={sector.sector_name}
                >
                  {number}
                  {number !== sector.sector_name && <sup>e</sup>}
                </button>
              );
            })}
          </div>
          
          {/* Légende */}
          <p className="text-xs text-muted-foreground">
            Cliquez sur les numéros pour sélectionner les arrondissements
          </p>
        </div>
      ) : (
        /* Affichage standard pour les autres villes */
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {sectorsToShow.map((sector) => (
              <Badge
                key={sector.sector_name}
                variant={selectedSectors.includes(sector.sector_name) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all text-xs px-2 py-0.5",
                  selectedSectors.includes(sector.sector_name) && "ring-1 ring-primary"
                )}
                onClick={() => onToggle(sector.sector_name)}
              >
                {selectedSectors.includes(sector.sector_name) && (
                  <Check className="w-3 h-3 mr-1" />
                )}
                {sector.sector_name}
              </Badge>
            ))}
          </div>
          
          {hasMore && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full h-8 text-xs text-muted-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Voir moins
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Voir {sectors.length - compactLimit} de plus
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

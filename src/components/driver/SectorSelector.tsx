import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Check, ChevronsUpDown, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { FRENCH_SECTORS, FRENCH_REGIONS } from "@/lib/frenchSectors";

interface SectorSelectorProps {
  selectedSectors: string[];
  onChange: (sectors: string[]) => void;
}

export const SectorSelector = ({ selectedSectors, onChange }: SectorSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (sectorId: string) => {
    const sector = FRENCH_SECTORS.find((s) => s.id === sectorId);
    if (!sector) return;

    if (selectedSectors.includes(sector.label)) {
      onChange(selectedSectors.filter((s) => s !== sector.label));
    } else {
      onChange([...selectedSectors, sector.label]);
    }
  };

  const handleSelectRegion = (regionId: string) => {
    const region = FRENCH_REGIONS.find((r) => r.id === regionId);
    if (!region || region.departmentIds.length === 0) return;

    const regionLabels = region.departmentIds
      .map((dId) => FRENCH_SECTORS.find((s) => s.id === dId)?.label)
      .filter(Boolean) as string[];

    const allSelected = regionLabels.every((l) => selectedSectors.includes(l));

    if (allSelected) {
      // Deselect all departments of this region
      onChange(selectedSectors.filter((s) => !regionLabels.includes(s)));
    } else {
      // Select all departments of this region
      const newSectors = [...selectedSectors];
      regionLabels.forEach((l) => {
        if (!newSectors.includes(l)) newSectors.push(l);
      });
      onChange(newSectors);
    }
  };

  const isRegionFullySelected = (regionId: string): boolean => {
    const region = FRENCH_REGIONS.find((r) => r.id === regionId);
    if (!region || region.departmentIds.length === 0) return false;
    return region.departmentIds.every((dId) => {
      const sector = FRENCH_SECTORS.find((s) => s.id === dId);
      return sector ? selectedSectors.includes(sector.label) : false;
    });
  };

  const isRegionPartiallySelected = (regionId: string): boolean => {
    const region = FRENCH_REGIONS.find((r) => r.id === regionId);
    if (!region || region.departmentIds.length === 0) return false;
    const some = region.departmentIds.some((dId) => {
      const sector = FRENCH_SECTORS.find((s) => s.id === dId);
      return sector ? selectedSectors.includes(sector.label) : false;
    });
    return some && !isRegionFullySelected(regionId);
  };

  const handleRemove = (sector: string) => {
    onChange(selectedSectors.filter((s) => s !== sector));
  };

  return (
    <div className="space-y-2">
      <Label>Secteurs de travail</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedSectors.length > 0
              ? `${selectedSectors.length} secteur(s) sélectionné(s)`
              : "Sélectionnez vos secteurs de travail"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" style={{ maxHeight: "400px" }}>
          <Command>
            <CommandInput placeholder="Rechercher un secteur ou une région..." />
            <CommandEmpty>Aucun secteur trouvé.</CommandEmpty>
            <CommandList>
              {/* Regions group */}
              <CommandGroup heading="📍 Régions (sélection rapide)">
                {FRENCH_REGIONS.filter(r => r.departmentIds.length > 0).map((region) => {
                  const full = isRegionFullySelected(region.id);
                  const partial = isRegionPartiallySelected(region.id);
                  return (
                    <CommandItem
                      key={region.id}
                      value={region.label}
                      onSelect={() => handleSelectRegion(region.id)}
                      className="font-medium"
                    >
                      <div className={cn(
                        "mr-2 h-4 w-4 rounded border flex items-center justify-center",
                        full ? "bg-primary border-primary" : partial ? "border-primary bg-primary/30" : "border-muted-foreground/30"
                      )}>
                        {full && <Check className="h-3 w-3 text-primary-foreground" />}
                        {partial && <div className="h-1.5 w-1.5 rounded-sm bg-primary" />}
                      </div>
                      <MapPin className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      {region.label}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {region.departmentIds.length} dép.
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandSeparator />

              {/* Individual departments */}
              <CommandGroup heading="Départements">
                {FRENCH_SECTORS.map((sector) => (
                  <CommandItem
                    key={sector.id}
                    value={sector.label}
                    onSelect={() => handleSelect(sector.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSectors.includes(sector.label) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {sector.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedSectors.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedSectors.map((sector) => (
            <Badge key={sector} variant="secondary" className="gap-1">
              {sector}
              <button
                onClick={() => handleRemove(sector)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Sélectionnez une région pour ajouter tous ses départements d'un coup
      </p>
    </div>
  );
};

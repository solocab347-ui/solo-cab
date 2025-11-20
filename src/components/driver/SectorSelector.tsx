import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FRENCH_SECTORS } from "@/lib/frenchSectors";

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
            <CommandInput placeholder="Rechercher un secteur..." />
            <CommandEmpty>Aucun secteur trouvé.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {FRENCH_SECTORS.map((sector) => (
                  <CommandItem
                    key={sector.id}
                    value={sector.label}
                    onSelect={() => handleSelect(sector.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSectors.includes(sector.label)
                          ? "opacity-100"
                          : "opacity-0"
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
        Sélectionnez les zones où vous exercez votre activité
      </p>
    </div>
  );
};

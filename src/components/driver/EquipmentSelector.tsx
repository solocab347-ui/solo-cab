import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { VEHICLE_EQUIPMENT } from "@/lib/vehicleEquipment";

interface EquipmentSelectorProps {
  selectedEquipment: string[];
  onChange: (equipment: string[]) => void;
}

export const EquipmentSelector = ({ selectedEquipment, onChange }: EquipmentSelectorProps) => {
  const handleToggle = (equipmentId: string) => {
    if (selectedEquipment.includes(equipmentId)) {
      onChange(selectedEquipment.filter((e) => e !== equipmentId));
    } else {
      onChange([...selectedEquipment, equipmentId]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-lg">🚗 Équipements disponibles</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Sélectionnez les équipements présents dans votre véhicule
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {VEHICLE_EQUIPMENT.map((equipment) => {
          const isSelected = selectedEquipment.includes(equipment.id);
          return (
            <Card
              key={equipment.id}
              onClick={() => handleToggle(equipment.id)}
              className={cn(
                "p-4 cursor-pointer transition-all hover:shadow-md relative",
                isSelected && "border-primary border-2 bg-primary/5"
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-2xl">{equipment.icon}</span>
                <span className="font-medium text-sm">{equipment.label}</span>
              </div>
            </Card>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground">
        {selectedEquipment.length} équipement(s) sélectionné(s)
      </p>
    </div>
  );
};

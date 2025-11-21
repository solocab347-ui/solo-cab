import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";
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
        <Label className="text-lg font-bold">🚗 Équipements disponibles</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Cliquez sur les équipements présents dans votre véhicule
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
                "p-4 cursor-pointer transition-all hover:shadow-lg relative border-2",
                isSelected 
                  ? "border-green-500 bg-green-500/10 shadow-md" 
                  : "border-gray-300 bg-white hover:border-gray-400"
              )}
            >
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center">
                {isSelected ? (
                  <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-white stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <X className="w-5 h-5 text-white stroke-[3]" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 pr-8">
                <span className="text-2xl">{equipment.icon}</span>
                <span className={cn(
                  "font-medium text-sm",
                  isSelected ? "text-green-700 font-bold" : "text-gray-700"
                )}>{equipment.label}</span>
              </div>
            </Card>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {selectedEquipment.length} équipement(s) sélectionné(s)
        </p>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-muted-foreground">Sélectionné</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </div>
            <span className="text-muted-foreground">Non sélectionné</span>
          </div>
        </div>
      </div>
    </div>
  );
};

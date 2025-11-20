import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DRIVER_SERVICES } from "@/lib/vehicleEquipment";

interface ServicesSelectorProps {
  selectedServices: string[];
  onChange: (services: string[]) => void;
}

export const ServicesSelector = ({ selectedServices, onChange }: ServicesSelectorProps) => {
  const handleToggle = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      onChange(selectedServices.filter((s) => s !== serviceId));
    } else {
      onChange([...selectedServices, serviceId]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-lg">💼 Services proposés</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Sélectionnez les services que vous proposez à vos clients
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DRIVER_SERVICES.map((service) => {
          const isSelected = selectedServices.includes(service.id);
          return (
            <Card
              key={service.id}
              onClick={() => handleToggle(service.id)}
              className={cn(
                "p-4 cursor-pointer transition-all hover:shadow-md relative",
                isSelected && "border-primary border-2 bg-primary/5"
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-2xl">{service.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{service.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {service.description}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground">
        {selectedServices.length} service(s) sélectionné(s)
      </p>
    </div>
  );
};

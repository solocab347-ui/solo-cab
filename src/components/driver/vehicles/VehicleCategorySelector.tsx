import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Zap, Leaf, Users, Accessibility } from "lucide-react";

export interface VehicleCategory {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  {
    value: 'berline_standard',
    label: 'Berline Standard',
    description: 'Véhicule berline classique',
    icon: <Car className="h-4 w-4" />,
  },
  {
    value: 'berline_luxe',
    label: 'Berline Luxe',
    description: 'Véhicule haut de gamme premium',
    icon: <Car className="h-4 w-4 text-amber-500" />,
  },
  {
    value: 'berline_electrique',
    label: 'Berline Électrique',
    description: 'Berline 100% électrique',
    icon: <Zap className="h-4 w-4 text-green-500" />,
  },
  {
    value: 'electrique',
    label: 'Électrique',
    description: 'Véhicule 100% électrique',
    icon: <Zap className="h-4 w-4 text-green-500" />,
  },
  {
    value: 'hybrid',
    label: 'Hybride',
    description: 'Véhicule hybride essence/électrique',
    icon: <Leaf className="h-4 w-4 text-emerald-500" />,
  },
  {
    value: 'van',
    label: 'Van',
    description: 'Van spacieux pour groupes',
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: 'suv',
    label: 'SUV',
    description: 'SUV confortable et spacieux',
    icon: <Car className="h-4 w-4" />,
  },
  {
    value: 'minivan',
    label: 'Minivan',
    description: 'Minivan pour familles',
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: 'tpmr',
    label: 'TPMR',
    description: 'Transport de personnes à mobilité réduite',
    icon: <Accessibility className="h-4 w-4 text-blue-500" />,
  },
];

interface VehicleCategorySelectorProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
}

export const VehicleCategorySelector: React.FC<VehicleCategorySelectorProps> = ({
  selectedCategories,
  onChange,
  disabled = false,
}) => {
  const handleCategoryToggle = (categoryValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedCategories, categoryValue]);
    } else {
      onChange(selectedCategories.filter((c) => c !== categoryValue));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5" />
          Catégories de véhicule
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sélectionnez une ou plusieurs catégories correspondant à votre véhicule
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VEHICLE_CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.value);
            return (
              <label
                key={category.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    handleCategoryToggle(category.value, checked as boolean)
                  }
                  disabled={disabled}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <span className="font-medium text-sm">{category.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {category.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Utility function to get category labels from values
export const getCategoryLabels = (categories: string[]): string[] => {
  return categories
    .map((value) => VEHICLE_CATEGORIES.find((c) => c.value === value)?.label)
    .filter((label): label is string => label !== undefined);
};

// Utility function to get category label from value
export const getCategoryLabel = (value: string): string => {
  const found = VEHICLE_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value;
};

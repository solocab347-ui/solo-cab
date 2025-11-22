// VTC Vehicles library with image mapping
import mercedesEClass from "@/assets/vehicles/mercedes-e-class.jpg";
import bmw5Series from "@/assets/vehicles/bmw-5-series.jpg";
import mercedesVClass from "@/assets/vehicles/mercedes-v-class.jpg";
import teslaModel3 from "@/assets/vehicles/tesla-model-3.jpg";

export interface VTCVehicle {
  id: string;
  brand: string;
  model: string;
  category: 'berline' | 'van' | 'electric' | 'premium';
  imageUrl: string;
  localImage?: string;
}

export const VTC_VEHICLES: VTCVehicle[] = [
  {
    id: 'mercedes-e-class',
    brand: 'Mercedes',
    model: 'Classe E',
    category: 'berline',
    imageUrl: 'mercedes-e-class',
    localImage: mercedesEClass,
  },
  {
    id: 'mercedes-s-class',
    brand: 'Mercedes',
    model: 'Classe S',
    category: 'premium',
    imageUrl: 'mercedes-s-class',
  },
  {
    id: 'mercedes-v-class',
    brand: 'Mercedes',
    model: 'Classe V',
    category: 'van',
    imageUrl: 'mercedes-v-class',
    localImage: mercedesVClass,
  },
  {
    id: 'mercedes-vito',
    brand: 'Mercedes',
    model: 'Vito',
    category: 'van',
    imageUrl: 'mercedes-vito',
  },
  {
    id: 'bmw-5-series',
    brand: 'BMW',
    model: 'Série 5',
    category: 'berline',
    imageUrl: 'bmw-5-series',
    localImage: bmw5Series,
  },
  {
    id: 'bmw-7-series',
    brand: 'BMW',
    model: 'Série 7',
    category: 'premium',
    imageUrl: 'bmw-7-series',
  },
  {
    id: 'audi-a6',
    brand: 'Audi',
    model: 'A6',
    category: 'berline',
    imageUrl: 'audi-a6',
  },
  {
    id: 'audi-a8',
    brand: 'Audi',
    model: 'A8',
    category: 'premium',
    imageUrl: 'audi-a8',
  },
  {
    id: 'tesla-model-s',
    brand: 'Tesla',
    model: 'Model S',
    category: 'electric',
    imageUrl: 'tesla-model-s',
  },
  {
    id: 'tesla-model-3',
    brand: 'Tesla',
    model: 'Model 3',
    category: 'electric',
    imageUrl: 'tesla-model-3',
    localImage: teslaModel3,
  },
  {
    id: 'tesla-model-x',
    brand: 'Tesla',
    model: 'Model X',
    category: 'electric',
    imageUrl: 'tesla-model-x',
  },
  {
    id: 'vw-caravelle',
    brand: 'Volkswagen',
    model: 'Caravelle',
    category: 'van',
    imageUrl: 'vw-caravelle',
  },
  {
    id: 'vw-multivan',
    brand: 'Volkswagen',
    model: 'Multivan',
    category: 'van',
    imageUrl: 'vw-multivan',
  },
  {
    id: 'renault-trafic',
    brand: 'Renault',
    model: 'Trafic',
    category: 'van',
    imageUrl: 'renault-trafic',
  },
  {
    id: 'peugeot-traveller',
    brand: 'Peugeot',
    model: 'Traveller',
    category: 'van',
    imageUrl: 'peugeot-traveller',
  },
  {
    id: 'peugeot-expert',
    brand: 'Peugeot',
    model: 'Expert',
    category: 'van',
    imageUrl: 'peugeot-expert',
  },
  {
    id: 'citroen-spacetourer',
    brand: 'Citroën',
    model: 'SpaceTourer',
    category: 'van',
    imageUrl: 'citroen-spacetourer',
  },
  {
    id: 'citroen-jumpy',
    brand: 'Citroën',
    model: 'Jumpy',
    category: 'van',
    imageUrl: 'citroen-jumpy',
  },
  {
    id: 'toyota-camry',
    brand: 'Toyota',
    model: 'Camry',
    category: 'berline',
    imageUrl: 'toyota-camry',
  },
  {
    id: 'skoda-superb',
    brand: 'Skoda',
    model: 'Superb',
    category: 'berline',
    imageUrl: 'skoda-superb',
  },
];

export const getCategoryLabel = (category: string): string => {
  const labels = {
    berline: 'Berline',
    van: 'Van / Monospace',
    electric: 'Électrique',
    premium: 'Premium',
  };
  return labels[category as keyof typeof labels] || category;
};

export const getCategoryColor = (category: string): string => {
  const colors = {
    berline: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    van: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    electric: 'bg-green-500/20 text-green-400 border-green-500/30',
    premium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return colors[category as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

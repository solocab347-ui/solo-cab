import { VEHICLE_EQUIPMENT, DRIVER_SERVICES } from "./vehicleEquipment";

// Fonction pour formater un ID en label lisible (fallback)
const formatIdAsLabel = (id: string): string => {
  return id
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};

export const getEquipmentLabel = (equipmentId: string): string => {
  const equipment = VEHICLE_EQUIPMENT.find((e) => e.id === equipmentId);
  return equipment?.label || formatIdAsLabel(equipmentId);
};

export const getEquipmentIcon = (equipmentId: string): string => {
  const equipment = VEHICLE_EQUIPMENT.find((e) => e.id === equipmentId);
  return equipment?.icon || "✓";
};

export const getServiceLabel = (serviceId: string): string => {
  const service = DRIVER_SERVICES.find((s) => s.id === serviceId);
  return service?.label || formatIdAsLabel(serviceId);
};

export const getServiceIcon = (serviceId: string): string => {
  const service = DRIVER_SERVICES.find((s) => s.id === serviceId);
  return service?.icon || "🔧";
};

export const getServiceDescription = (serviceId: string): string => {
  const service = DRIVER_SERVICES.find((s) => s.id === serviceId);
  return service?.description || "";
};

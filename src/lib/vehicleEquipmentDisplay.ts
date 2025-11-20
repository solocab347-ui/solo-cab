import { VEHICLE_EQUIPMENT, DRIVER_SERVICES } from "./vehicleEquipment";

export const getEquipmentLabel = (equipmentId: string): string => {
  const equipment = VEHICLE_EQUIPMENT.find((e) => e.id === equipmentId);
  return equipment?.label || equipmentId;
};

export const getEquipmentIcon = (equipmentId: string): string => {
  const equipment = VEHICLE_EQUIPMENT.find((e) => e.id === equipmentId);
  return equipment?.icon || "📦";
};

export const getServiceLabel = (serviceId: string): string => {
  const service = DRIVER_SERVICES.find((s) => s.id === serviceId);
  return service?.label || serviceId;
};

export const getServiceIcon = (serviceId: string): string => {
  const service = DRIVER_SERVICES.find((s) => s.id === serviceId);
  return service?.icon || "🔧";
};

export const getServiceDescription = (serviceId: string): string => {
  const service = DRIVER_SERVICES.find((s) => s.id === serviceId);
  return service?.description || "";
};

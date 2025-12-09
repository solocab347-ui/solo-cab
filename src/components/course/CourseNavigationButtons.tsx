import { NavigationSelector } from "@/components/NavigationSelector";
import { NavigationDestination } from "@/lib/navigationApp";

interface CourseNavigationButtonsProps {
  status: string;
  pickupAddress: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  destinationAddress: string;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
}

export function CourseNavigationButtons({
  status,
  pickupAddress,
  pickupLatitude,
  pickupLongitude,
  destinationAddress,
  destinationLatitude,
  destinationLongitude,
}: CourseNavigationButtonsProps) {
  const pickupDestination: NavigationDestination = {
    address: pickupAddress,
    latitude: pickupLatitude ?? undefined,
    longitude: pickupLongitude ?? undefined,
  };

  const finalDestination: NavigationDestination = {
    address: destinationAddress,
    latitude: destinationLatitude ?? undefined,
    longitude: destinationLongitude ?? undefined,
  };

  // Avant de démarrer la course : naviguer vers le lieu de prise en charge
  if (status === "accepted" || status === "confirmed") {
    return (
      <NavigationSelector
        destination={pickupDestination}
        label="Naviguer vers le client"
        variant="default"
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
      />
    );
  }

  // Course en cours : naviguer vers la destination
  if (status === "in_progress") {
    return (
      <NavigationSelector
        destination={finalDestination}
        origin={pickupDestination}
        label="Naviguer vers la destination"
        variant="default"
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
      />
    );
  }

  return null;
}

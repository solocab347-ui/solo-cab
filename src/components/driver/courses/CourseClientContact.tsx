import { Phone } from "lucide-react";

interface CourseClientContactProps {
  course: {
    is_guest_booking?: boolean;
    guest_phone?: string | null;
    clients?: {
      profiles?: {
        phone?: string | null;
      };
    };
  };
  // Props pour les courses entreprise (employé)
  employeePhone?: string | null;
}

export function CourseClientContact({ course, employeePhone }: CourseClientContactProps) {
  // Helper pour obtenir le téléphone du client (employé entreprise, enregistré ou invité)
  const getClientPhone = (): string | null => {
    // Priorité 1: Téléphone de l'employé entreprise (passé en props)
    if (employeePhone) {
      return employeePhone;
    }
    
    // Priorité 2: Client invité ou client classique
    if (course.is_guest_booking || !course.clients?.profiles?.phone) {
      return course.guest_phone || null;
    }
    return course.clients.profiles.phone;
  };

  const phone = getClientPhone();

  if (!phone) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
      <Phone className="w-4 h-4 text-primary shrink-0" />
      <a 
        href={`tel:${phone}`} 
        className="text-sm font-medium text-primary hover:underline"
      >
        {phone}
      </a>
      <span className="text-xs text-muted-foreground">- Appeler le passager</span>
    </div>
  );
}

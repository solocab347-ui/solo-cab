import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Course {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: Database["public"]["Enums"]["course_status"];
  distance_km?: number | null;
  passengers_count?: number;
}

interface Devis {
  quote_number: string | null;
  amount: number;
  status: Database["public"]["Enums"]["devis_status"];
  valid_until?: string;
  base_price?: number;
  distance_price?: number;
  time_price?: number | null;
}

interface Facture {
  invoice_number_generated: string | null;
  invoice_number: string;
  amount: number;
  payment_method?: string | null;
  created_at: string;
}

interface Profile {
  full_name: string;
  phone?: string | null;
  email?: string;
}

interface Driver {
  company_name?: string | null;
  profiles: Profile;
}

interface Client {
  profiles: Profile;
}

// ========== GÉNÉRATION DE MESSAGES POUR LES DEVIS ==========
export const generateDevisShareMessage = (
  devis: Devis,
  course: Course,
  driver: Driver,
  client: Client,
  isDriver: boolean
): string => {
  const formattedDate = format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  const driverName = driver.profiles.full_name;
  const clientName = client.profiles.full_name;
  
  if (isDriver) {
    // Message du chauffeur vers le client
    return `Bonjour ${clientName},

Je vous ai envoyé un devis pour votre course :

📍 Départ : ${course.pickup_address}
📍 Arrivée : ${course.destination_address}
📅 Date : ${formattedDate}
${course.distance_km ? `📏 Distance : ${course.distance_km} km` : ''}
${course.passengers_count ? `👥 Passagers : ${course.passengers_count}` : ''}

💰 Montant : ${devis.amount.toFixed(2)}€
📄 Référence : ${devis.quote_number}
⏰ Valable jusqu'au ${devis.valid_until ? format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr }) : '7 jours'}

Merci de consulter votre espace client pour accepter le devis.

Dans l'attente de votre retour.

Cordialement,
${driverName}
${driver.company_name ? driver.company_name : ''}
${driver.profiles.phone ? `📞 ${driver.profiles.phone}` : ''}`;
  } else {
    // Message du client vers le chauffeur
    return `Bonjour ${driverName},

J'ai bien reçu votre devis pour ma réservation :

📍 Départ : ${course.pickup_address}
📍 Arrivée : ${course.destination_address}
📅 Date : ${formattedDate}

💰 Montant : ${devis.amount.toFixed(2)}€
📄 Référence : ${devis.quote_number}

${devis.status === 'accepted' 
  ? "J'ai accepté ce devis. Pouvez-vous confirmer la réservation ?" 
  : "Je vais examiner votre proposition et vous donner une réponse rapidement."}

Cordialement,
${clientName}
${client.profiles.phone ? `📞 ${client.profiles.phone}` : ''}`;
  }
};

// ========== GÉNÉRATION DE MESSAGES POUR LES FACTURES ==========
export const generateFactureShareMessage = (
  facture: Facture,
  course: Course,
  driver: Driver,
  client: Client,
  isDriver: boolean
): string => {
  const formattedDate = format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  const factureDate = format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr });
  const driverName = driver.profiles.full_name;
  const clientName = client.profiles.full_name;
  const invoiceNumber = facture.invoice_number_generated || facture.invoice_number;
  
  if (isDriver) {
    // Message du chauffeur vers le client
    return `Bonjour ${clientName},

Merci d'avoir fait appel à mes services.

Veuillez trouver ci-joint la facture pour votre course :

📄 Facture n° ${invoiceNumber}
📅 Date de la facture : ${factureDate}
📅 Date de la course : ${formattedDate}

📍 Départ : ${course.pickup_address}
📍 Arrivée : ${course.destination_address}
${course.distance_km ? `📏 Distance parcourue : ${course.distance_km} km` : ''}

💰 Montant total : ${facture.amount.toFixed(2)}€
💳 Mode de paiement : ${facture.payment_method || 'Non précisé'}

Au plaisir de vous revoir pour une prochaine course.

Cordialement,
${driverName}
${driver.company_name ? driver.company_name : ''}
${driver.profiles.phone ? `📞 ${driver.profiles.phone}` : ''}`;
  } else {
    // Message du client vers le chauffeur ou tiers
    return `Bonjour,

Veuillez trouver ma facture de transport :

📄 Facture n° ${invoiceNumber}
👤 Chauffeur : ${driverName}${driver.company_name ? ` (${driver.company_name})` : ''}
📅 Date de la course : ${formattedDate}
📅 Date de la facture : ${factureDate}

📍 Trajet : ${course.pickup_address} → ${course.destination_address}
${course.distance_km ? `📏 Distance : ${course.distance_km} km` : ''}

💰 Montant : ${facture.amount.toFixed(2)}€
💳 Payé par : ${facture.payment_method || 'Non précisé'}

Cordialement,
${clientName}`;
  }
};

// ========== GÉNÉRATION DE MESSAGES POUR LES COURSES ==========
export const generateCourseShareMessage = (
  course: Course,
  devis: Devis | null,
  senderProfile: Profile,
  isDriver: boolean,
  recipientName?: string
): { title: string; message: string } => {
  const formattedDate = format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  const recipientGreeting = recipientName ? `Bonjour ${recipientName},\n\n` : "Bonjour,\n\n";

  // Course en attente de devis
  if (!devis || devis.status === "pending") {
    if (isDriver) {
      return {
        title: "Nouvelle course proposée",
        message: `${recipientGreeting}Je vous propose une course :\n\n📍 Départ : ${course.pickup_address}\n📍 Arrivée : ${course.destination_address}\n📅 Date : ${formattedDate}\n${course.passengers_count ? `👥 Passagers : ${course.passengers_count}` : ''}\n\nVous recevrez un devis sous peu.\n\nCordialement,\n${senderProfile.full_name}`,
      };
    } else {
      return {
        title: "Demande de course",
        message: `${recipientGreeting}Je souhaite réserver une course :\n\n📍 Départ : ${course.pickup_address}\n📍 Arrivée : ${course.destination_address}\n📅 Date : ${formattedDate}\n${course.passengers_count ? `👥 Passagers : ${course.passengers_count}` : ''}\n\nPouvez-vous me faire parvenir un devis ?\n\nMerci d'avance.\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`,
      };
    }
  }

  // Devis accepté, course confirmée
  if (devis.status === "accepted" && course.status === "accepted") {
    if (isDriver) {
      return {
        title: "Course confirmée",
        message: `${recipientGreeting}Votre réservation est confirmée !\n\n📄 Devis n° ${devis.quote_number}\n💰 Montant : ${devis.amount.toFixed(2)}€\n\n📍 Départ : ${course.pickup_address}\n📍 Arrivée : ${course.destination_address}\n📅 Date : ${formattedDate}\n${course.passengers_count ? `👥 Passagers : ${course.passengers_count}` : ''}\n\nJe serai ponctuel au rendez-vous.\n\nÀ très bientôt !\n\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`,
      };
    } else {
      return {
        title: "Confirmation de réservation",
        message: `${recipientGreeting}J'ai bien accepté votre devis n° ${devis.quote_number} d'un montant de ${devis.amount.toFixed(2)}€.\n\n📍 Départ : ${course.pickup_address}\n📍 Arrivée : ${course.destination_address}\n📅 Date : ${formattedDate}\n\nPouvez-vous confirmer que vous êtes disponible ?\n\nMerci.\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`,
      };
    }
  }

  // Course en cours
  if (course.status === "in_progress") {
    if (isDriver) {
      return {
        title: "Course en cours",
        message: `${recipientGreeting}La course est en cours d'exécution.\n\n📄 Référence : ${devis.quote_number}\n📍 Direction : ${course.destination_address}\n\nÀ tout de suite !\n\n${senderProfile.full_name}`,
      };
    } else {
      return {
        title: "Course en cours",
        message: `${recipientGreeting}Notre course est actuellement en cours.\n\n📄 Référence : ${devis.quote_number}\n\nMerci pour votre professionnalisme.\n\n${senderProfile.full_name}`,
      };
    }
  }

  // Course terminée
  if (course.status === "completed") {
    if (isDriver) {
      return {
        title: "Course terminée",
        message: `${recipientGreeting}La course s'est terminée avec succès.\n\n📄 Référence : ${devis.quote_number}\n💰 Montant : ${devis.amount.toFixed(2)}€\n\nMerci infiniment pour votre confiance !\nJ'espère vous revoir très prochainement.\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`,
      };
    } else {
      return {
        title: "Course terminée - Merci",
        message: `${recipientGreeting}La course s'est parfaitement déroulée, merci beaucoup.\n\n📄 Référence : ${devis.quote_number}\n💰 Montant : ${devis.amount.toFixed(2)}€\n\nÀ une prochaine fois !\n\nCordialement,\n${senderProfile.full_name}`,
      };
    }
  }

  // Course annulée
  if (course.status === "cancelled") {
    if (isDriver) {
      return {
        title: "Course annulée",
        message: `${recipientGreeting}La course a été annulée.\n\n📄 Référence : ${devis.quote_number}\n\nN'hésitez pas à me recontacter pour une future réservation.\nJe reste à votre disposition.\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`,
      };
    } else {
      return {
        title: "Annulation de course",
        message: `${recipientGreeting}Je me vois dans l'obligation d'annuler la course.\n\n📄 Référence : ${devis.quote_number}\n\nToutes mes excuses pour ce désagrément.\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`,
      };
    }
  }

  // Devis refusé
  if (devis.status === "rejected") {
    if (isDriver) {
      return {
        title: "Devis refusé",
        message: `${recipientGreeting}Le devis n° ${devis.quote_number} a été refusé.\n\nN'hésitez pas à me recontacter si vous souhaitez discuter d'une nouvelle proposition.\nJe reste à votre écoute.\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`,
      };
    } else {
      return {
        title: "Refus de devis",
        message: `${recipientGreeting}Je suis au regret de devoir refuser le devis n° ${devis.quote_number}.\n\nMerci néanmoins pour votre proposition.\n\nCordialement,\n${senderProfile.full_name}`,
      };
    }
  }

  // Fallback par défaut
  return {
    title: "Information sur la course",
    message: `${recipientGreeting}Concernant la course :\n\n📄 Référence : ${devis.quote_number}\n📍 Départ : ${course.pickup_address}\n📍 Arrivée : ${course.destination_address}\n📅 Date : ${formattedDate}\n💰 Montant : ${devis.amount.toFixed(2)}€\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`,
  };
}

// Génère des messages contextuels pour les partages de courses selon le statut et le rôle

interface Course {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  course_number?: string;
  created_by_user_id?: string;
}

interface Devis {
  status: string;
  amount: number;
  quote_number?: string;
}

interface Profile {
  full_name: string;
}

export function generateCourseShareMessage(
  course: Course,
  devis: Devis | null,
  senderProfile: Profile,
  isDriver: boolean,
  recipientName?: string
): { title: string; message: string } {
  const courseName = course.course_number || 'Course';
  const amount = devis?.amount ? `${devis.amount.toFixed(2)}€` : '';
  const recipient = recipientName ? recipientName : isDriver ? 'votre client' : 'votre chauffeur';

  // Course en attente d'acceptation client (driver-created)
  if (isDriver && devis?.status === 'pending' && course.status === 'pending') {
    return {
      title: `Devis ${devis.quote_number || courseName}`,
      message: `Bonjour ${recipient},\n\nJe vous ai envoyé un devis pour votre course du ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')}.\n\nTrajet : ${course.pickup_address} → ${course.destination_address}\nMontant : ${amount}\n\nVeuillez l'accepter pour confirmer la réservation.\n\nCordialement,\n${senderProfile.full_name}`
    };
  }

  // Course en attente d'acceptation driver (client-created)
  if (!isDriver && devis?.status === 'accepted' && course.status === 'pending') {
    return {
      title: `Demande de course ${courseName}`,
      message: `Bonjour ${recipient},\n\nJ'ai fait une demande de course pour le ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')}.\n\nTrajet : ${course.pickup_address} → ${course.destination_address}\nMontant proposé : ${amount}\n\nJ'attends votre confirmation.\n\nCordialement,\n${senderProfile.full_name}`
    };
  }

  // Course confirmée (accepted)
  if (course.status === 'accepted' && devis?.status === 'accepted') {
    return {
      title: `Course confirmée ${courseName}`,
      message: `Bonjour ${recipient},\n\nVotre course est confirmée pour le ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')}.\n\nTrajet : ${course.pickup_address} → ${course.destination_address}\nMontant : ${amount}\n\n${isDriver ? 'Je vous retrouve au point de départ.' : 'Merci de votre confiance.'}\n\nCordialement,\n${senderProfile.full_name}`
    };
  }

  // Course en cours (in_progress)
  if (course.status === 'in_progress') {
    return {
      title: `Course en cours ${courseName}`,
      message: `Bonjour ${recipient},\n\nLa course du ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')} est actuellement en cours.\n\nTrajet : ${course.pickup_address} → ${course.destination_address}\nMontant : ${amount}\n\n${isDriver ? 'Je vous tiens informé de l\'avancement.' : 'Merci pour votre patience.'}\n\nCordialement,\n${senderProfile.full_name}`
    };
  }

  // Course terminée (completed)
  if (course.status === 'completed') {
    return {
      title: `Course terminée ${courseName}`,
      message: `Bonjour ${recipient},\n\nLa course du ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')} est terminée.\n\nTrajet : ${course.pickup_address} → ${course.destination_address}\nMontant : ${amount}\n\n${isDriver ? 'Facture disponible. Merci pour votre confiance.' : 'Merci pour le service.'}\n\nCordialement,\n${senderProfile.full_name}`
    };
  }

  // Course refusée (rejected)
  if (devis?.status === 'rejected') {
    return {
      title: `Course refusée ${courseName}`,
      message: `Bonjour ${recipient},\n\nLa course du ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')} a été refusée.\n\nTrajet : ${course.pickup_address} → ${course.destination_address}\n\n${isDriver ? 'N\'hésitez pas à me recontacter pour une nouvelle demande.' : 'Je reste disponible pour d\'autres courses.'}\n\nCordialement,\n${senderProfile.full_name}`
    };
  }

  // Cas par défaut
  return {
    title: `Course ${courseName}`,
    message: `Bonjour ${recipient},\n\nCourse du ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')}.\n\nTrajet : ${course.pickup_address} → ${course.destination_address}\nMontant : ${amount}\n\nCordialement,\n${senderProfile.full_name}`
  };
}

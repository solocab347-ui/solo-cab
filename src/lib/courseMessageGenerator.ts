// Génère des messages contextuels pour les partages de courses selon le statut et le rôle

interface Course {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  course_number?: string;
  created_by_user_id?: string;
  passengers_count?: number;
}

interface Devis {
  status: string;
  amount: number;
  quote_number?: string;
}

interface Profile {
  full_name: string;
  phone?: string;
}

export function generateCourseShareMessage(
  course: Course,
  devis: Devis | null,
  senderProfile: Profile,
  isDriver: boolean,
  recipientName?: string
): { title: string; message: string } {
  const courseName = course.course_number || devis?.quote_number || 'Course';
  const amount = devis?.amount ? `${devis.amount.toFixed(2)}€` : '';
  const recipient = recipientName || (isDriver ? 'Madame, Monsieur' : 'Monsieur le Chauffeur');
  const dateFormatted = new Date(course.scheduled_date).toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeFormatted = new Date(course.scheduled_date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Course en attente d'acceptation client (driver-created)
  if (isDriver && devis?.status === 'pending' && course.status === 'pending') {
    return {
      title: `Devis ${devis.quote_number || courseName}`,
      message: `Bonjour ${recipient},\n\nJe vous contacte concernant votre demande de réservation.\n\nJe vous ai préparé un devis (${devis.quote_number}) pour votre course prévue le ${dateFormatted} à ${timeFormatted}.\n\n📍 Détails du trajet :\nDépart : ${course.pickup_address}\nArrivée : ${course.destination_address}\n${course.passengers_count ? `Nombre de passagers : ${course.passengers_count}\n` : ''}\n💶 Montant : ${amount}\n\nPour confirmer cette réservation, veuillez accepter ce devis. Je reste à votre disposition pour toute question.\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`
    };
  }

  // Course en attente d'acceptation driver (client-created)
  if (!isDriver && devis?.status === 'accepted' && course.status === 'pending') {
    return {
      title: `Demande de course ${courseName}`,
      message: `Bonjour ${recipient},\n\nJ'ai effectué une demande de réservation pour le ${dateFormatted} à ${timeFormatted}.\n\n📍 Détails du trajet :\nDépart : ${course.pickup_address}\nArrivée : ${course.destination_address}\n${course.passengers_count ? `Nombre de passagers : ${course.passengers_count}\n` : ''}\n💶 Montant proposé : ${amount}\n\nJ'ai accepté le devis (${devis.quote_number}) et j'attends maintenant votre confirmation pour finaliser la réservation.\n\nMerci de me tenir informé dès que possible.\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`
    };
  }

  // Course confirmée (accepted)
  if (course.status === 'accepted' && devis?.status === 'accepted') {
    return {
      title: `✅ Course confirmée ${courseName}`,
      message: `Bonjour ${recipient},\n\nJe vous confirme que notre course est bien réservée pour le ${dateFormatted} à ${timeFormatted}.\n\n📍 Trajet confirmé :\nDépart : ${course.pickup_address}\nArrivée : ${course.destination_address}\n${course.passengers_count ? `Nombre de passagers : ${course.passengers_count}\n` : ''}\n💶 Montant : ${amount}\n📄 Référence : ${devis.quote_number}\n\n${isDriver ? 
  `Je serai à l'heure au point de rendez-vous. N'hésitez pas à me contacter si vous avez besoin de modifier quoi que ce soit.` : 
  `Je vous remercie pour votre réactivité. J'ai hâte de voyager avec vous.`}\n\nÀ très bientôt,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`
    };
  }

  // Course en cours (in_progress)
  if (course.status === 'in_progress') {
    return {
      title: `🚗 Course en cours ${courseName}`,
      message: `Bonjour ${recipient},\n\nNotre course du ${dateFormatted} est actuellement en cours.\n\n📍 Trajet :\nDépart : ${course.pickup_address}\nArrivée : ${course.destination_address}\n💶 Montant : ${amount}\n\n${isDriver ? 
  `Nous roulons vers votre destination. J'espère que le trajet se passe bien. Je vous tiendrai informé de notre progression.` : 
  `Je vous remercie pour cette prestation. Le trajet se déroule dans de bonnes conditions.`}\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`
    };
  }

  // Course terminée (completed)
  if (course.status === 'completed') {
    return {
      title: `✅ Course terminée ${courseName}`,
      message: `Bonjour ${recipient},\n\nLa course du ${dateFormatted} est maintenant terminée.\n\n📍 Trajet effectué :\nDépart : ${course.pickup_address}\nArrivée : ${course.destination_address}\n💶 Montant : ${amount}\n📄 Référence : ${devis.quote_number}\n\n${isDriver ? 
  `Merci pour votre confiance. Votre facture est maintenant disponible. Au plaisir de vous servir à nouveau !` : 
  `Je vous remercie pour cette prestation de qualité. J'espère avoir l'occasion de voyager à nouveau avec vous.`}\n\n${isDriver ? 'N\'hésitez pas à me recommander à votre entourage.' : ''}\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`
    };
  }

  // Course annulée (cancelled)
  if (course.status === 'cancelled') {
    return {
      title: `❌ Course annulée ${courseName}`,
      message: `Bonjour ${recipient},\n\nJe vous informe que la course du ${dateFormatted} à ${timeFormatted} a été annulée.\n\n📍 Trajet concerné :\nDépart : ${course.pickup_address}\nArrivée : ${course.destination_address}\n\n${isDriver ? 
  `Je suis désolé pour ce désagrément. Si vous souhaitez reprogrammer cette course, n'hésitez pas à me recontacter. Je reste à votre entière disposition.` : 
  `Je vous prie d'accepter mes excuses pour cette annulation. Je reste disponible pour de futures réservations.`}\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`
    };
  }

  // Course refusée (rejected)
  if (devis?.status === 'rejected') {
    return {
      title: `❌ Devis refusé ${courseName}`,
      message: `Bonjour ${recipient},\n\nConcernant la demande de course pour le ${dateFormatted} :\n\n📍 Trajet :\nDépart : ${course.pickup_address}\nArrivée : ${course.destination_address}\n💶 Montant : ${amount}\n\nLe devis (${devis.quote_number}) n'a malheureusement pas été accepté.\n\n${isDriver ? 
  `Si vous changez d'avis ou souhaitez discuter d'une nouvelle proposition, n'hésitez pas à me recontacter. Je reste à votre disposition.` : 
  `Je vous remercie d'avoir pris le temps d'étudier ma demande. Je reste ouvert à d'autres opportunités de collaboration.`}\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`
    };
  }

  // Cas par défaut - Information générale
  return {
    title: `Course ${courseName}`,
    message: `Bonjour ${recipient},\n\nConcernant la course du ${dateFormatted} à ${timeFormatted} :\n\n📍 Trajet :\nDépart : ${course.pickup_address}\nArrivée : ${course.destination_address}\n${course.passengers_count ? `Nombre de passagers : ${course.passengers_count}\n` : ''}${amount ? `💶 Montant : ${amount}\n` : ''}${devis?.quote_number ? `📄 Référence : ${devis.quote_number}\n` : ''}\n\nPour toute question, n'hésitez pas à me contacter.\n\nCordialement,\n${senderProfile.full_name}${senderProfile.phone ? `\n📞 ${senderProfile.phone}` : ''}`
  };
}

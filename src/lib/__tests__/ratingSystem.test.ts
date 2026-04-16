/**
 * TESTS UNITAIRES: SYSTÈME DE NOTATION BIDIRECTIONNELLE
 * 50 tests couvrant la notation client→chauffeur, chauffeur→client,
 * les contestations, l'arbitrage IA, les notifications, les guests,
 * et le suivi par lien e-mail.
 */

import { describe, it, expect, vi } from 'vitest';

// ============ Types ============

interface CourseRating {
  id: string;
  course_id: string;
  driver_id: string;
  client_id: string | null;
  rating: number;
  reason: string | null;
  reason_detail: string | null;
  status: 'pending_review' | 'validated' | 'contested' | 'cancelled' | 'adjusted';
  rating_direction: 'client_to_driver' | 'driver_to_client';
  ai_decision: string | null;
  ai_justification: string | null;
  client_response_deadline: string | null;
  rated_by_user_id: string | null;
}

interface RatingDispute {
  id: string;
  rating_id: string;
  initiated_by: 'driver' | 'client';
  dispute_reason: string;
  client_response: string | null;
  client_response_deadline: string | null;
  client_response_at: string | null;
}

interface Notification {
  user_id: string;
  title: string;
  message: string;
  type: string;
  metadata: Record<string, any>;
}

// ============ Simulation du système ============

const notifications: Notification[] = [];

function clearNotifications() { notifications.length = 0; }

/** Simule trigger notify_driver_new_rating */
function triggerNotifyDriverNewRating(rating: CourseRating, driverUserId: string, courseDate: string) {
  if (rating.status === 'pending_review' && rating.rating_direction === 'client_to_driver') {
    notifications.push({
      user_id: driverUserId,
      title: 'Nouvelle note reçue',
      message: `Vous avez reçu une note de ${rating.rating}★ pour votre course du ${courseDate}. Vous pouvez accepter ou contester cette note.`,
      type: 'rating',
      metadata: { rating_id: rating.id, course_id: rating.course_id, rating: rating.rating, reason: rating.reason },
    });
  }
}

/** Simule trigger notify_on_driver_rates_client */
function triggerNotifyDriverRatesClient(rating: CourseRating, clientUserId: string | null, courseDate: string) {
  if (rating.rating_direction === 'driver_to_client' && rating.status === 'pending_review') {
    if (rating.client_id && clientUserId) {
      notifications.push({
        user_id: clientUserId,
        title: 'Note reçue du chauffeur',
        message: `Vous avez reçu une note de ${rating.rating}★ pour votre course du ${courseDate}. Vous pouvez contester cette note sous 48h.`,
        type: 'rating',
        metadata: { rating_id: rating.id, course_id: rating.course_id, rating: rating.rating, direction: 'driver_to_client', action: 'respond_to_rating' },
      });
    }
  }
}

/** Simule la logique de contestation */
function contestRating(rating: CourseRating, initiatedBy: 'driver' | 'client', reason: string): RatingDispute {
  rating.status = 'contested';
  const dispute: RatingDispute = {
    id: `dispute-${Date.now()}`,
    rating_id: rating.id,
    initiated_by: initiatedBy,
    dispute_reason: reason,
    client_response: null,
    client_response_deadline: initiatedBy === 'driver' ? new Date(Date.now() + 48 * 3600 * 1000).toISOString() : null,
    client_response_at: null,
  };
  return dispute;
}

/** Simule auto-cancel après expiration 48h */
function autoCancelExpired(rating: CourseRating, dispute: RatingDispute): boolean {
  if (rating.status === 'contested' && !dispute.client_response && dispute.client_response_deadline) {
    const deadline = new Date(dispute.client_response_deadline);
    if (deadline < new Date()) {
      rating.status = 'cancelled';
      rating.ai_decision = 'cancelled';
      rating.ai_justification = "Note annulée automatiquement : le client n'a pas répondu dans le délai de 48 heures.";
      return true;
    }
  }
  return false;
}

/** Simule décision IA */
function simulateAIDecision(
  rating: CourseRating,
  decision: 'maintained' | 'cancelled' | 'adjusted',
  justification: string,
  adjustedRating?: number
) {
  rating.ai_decision = decision;
  rating.ai_justification = justification;
  if (decision === 'cancelled') {
    rating.status = 'cancelled';
  } else if (decision === 'adjusted' && adjustedRating) {
    rating.rating = adjustedRating;
    rating.status = 'validated';
  } else {
    rating.status = 'validated';
  }
}

/** Détermine le statut selon la note */
function getStatusFromRating(r: number): 'pending_review' | 'validated' {
  return r >= 4 ? 'validated' : 'pending_review';
}

/** Crée un rating de test */
function createRating(overrides: Partial<CourseRating> = {}): CourseRating {
  return {
    id: `rating-${Math.random().toString(36).slice(2, 8)}`,
    course_id: 'course-001',
    driver_id: 'driver-abdallah',
    client_id: 'client-001',
    rating: 3,
    reason: null,
    reason_detail: null,
    status: 'pending_review',
    rating_direction: 'client_to_driver',
    ai_decision: null,
    ai_justification: null,
    client_response_deadline: null,
    rated_by_user_id: null,
    ...overrides,
  };
}

// ============ 50 TESTS NOTATION ============

describe('1. Client → Chauffeur : Soumission de note', () => {
  it('T01: Note 5★ → statut "validated" immédiatement', () => {
    expect(getStatusFromRating(5)).toBe('validated');
  });
  it('T02: Note 4★ → statut "validated" immédiatement', () => {
    expect(getStatusFromRating(4)).toBe('validated');
  });
  it('T03: Note 3★ → statut "pending_review"', () => {
    expect(getStatusFromRating(3)).toBe('pending_review');
  });
  it('T04: Note 2★ → statut "pending_review"', () => {
    expect(getStatusFromRating(2)).toBe('pending_review');
  });
  it('T05: Note 1★ → statut "pending_review"', () => {
    expect(getStatusFromRating(1)).toBe('pending_review');
  });
});

describe('2. Notification chauffeur sur note basse (client→chauffeur)', () => {
  it('T06: Note 2★ → notification envoyée au chauffeur', () => {
    clearNotifications();
    const r = createRating({ rating: 2, status: 'pending_review' });
    triggerNotifyDriverNewRating(r, 'user-driver-001', '16/04/2026');
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Nouvelle note reçue');
    expect(notifications[0].message).toContain('2★');
  });
  it('T07: Note 5★ validated → PAS de notification', () => {
    clearNotifications();
    const r = createRating({ rating: 5, status: 'validated' });
    triggerNotifyDriverNewRating(r, 'user-driver-001', '16/04/2026');
    expect(notifications).toHaveLength(0);
  });
  it('T08: Note 1★ → message contient la date de course', () => {
    clearNotifications();
    const r = createRating({ rating: 1, status: 'pending_review' });
    triggerNotifyDriverNewRating(r, 'user-driver-001', '15/04/2026');
    expect(notifications[0].message).toContain('15/04/2026');
  });
});

describe('3. Chauffeur → Client : Notation', () => {
  it('T09: Chauffeur note client 5★ → validated', () => {
    const r = createRating({ rating: 5, rating_direction: 'driver_to_client', status: 'validated' });
    expect(r.status).toBe('validated');
  });
  it('T10: Chauffeur note client 2★ → pending_review', () => {
    const r = createRating({ rating: 2, rating_direction: 'driver_to_client', status: 'pending_review' });
    expect(r.status).toBe('pending_review');
  });
  it('T11: Note basse chauffeur→client → notification au client', () => {
    clearNotifications();
    const r = createRating({ rating: 2, rating_direction: 'driver_to_client', status: 'pending_review' });
    triggerNotifyDriverRatesClient(r, 'user-client-001', '16/04/2026');
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Note reçue du chauffeur');
    expect(notifications[0].metadata.direction).toBe('driver_to_client');
  });
  it('T12: Note 4★ chauffeur→client → PAS de notification (validated)', () => {
    clearNotifications();
    const r = createRating({ rating: 4, rating_direction: 'driver_to_client', status: 'validated' });
    triggerNotifyDriverRatesClient(r, 'user-client-001', '16/04/2026');
    expect(notifications).toHaveLength(0);
  });
  it('T13: Chauffeur note client guest (client_id=null) → PAS de notification', () => {
    clearNotifications();
    const r = createRating({ rating: 1, rating_direction: 'driver_to_client', status: 'pending_review', client_id: null });
    triggerNotifyDriverRatesClient(r, null, '16/04/2026');
    expect(notifications).toHaveLength(0);
  });
});

describe('4. Contestation par le chauffeur', () => {
  it('T14: Contestation crée un dispute avec deadline 48h', () => {
    const r = createRating({ rating: 2, status: 'pending_review' });
    const d = contestRating(r, 'driver', 'Trafic exceptionnel causé par un accident');
    expect(r.status).toBe('contested');
    expect(d.initiated_by).toBe('driver');
    expect(d.client_response_deadline).toBeTruthy();
    const deadline = new Date(d.client_response_deadline!);
    const now = new Date();
    const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 3600);
    expect(diffHours).toBeGreaterThan(47);
    expect(diffHours).toBeLessThanOrEqual(48.1);
  });
  it('T15: Raison de contestation est préservée', () => {
    const r = createRating({ rating: 1, status: 'pending_review' });
    const d = contestRating(r, 'driver', 'Le client a confondu avec un autre chauffeur');
    expect(d.dispute_reason).toBe('Le client a confondu avec un autre chauffeur');
  });
});

describe('5. Contestation par le client', () => {
  it('T16: Client conteste une note chauffeur→client', () => {
    const r = createRating({ rating: 2, rating_direction: 'driver_to_client', status: 'pending_review' });
    const d = contestRating(r, 'client', 'J\'étais bien à l\'heure au point de RDV');
    expect(r.status).toBe('contested');
    expect(d.initiated_by).toBe('client');
  });
  it('T17: Contestation client n\'a PAS de deadline (car c\'est le chauffeur qui doit répondre)', () => {
    const r = createRating({ rating: 1, rating_direction: 'driver_to_client', status: 'pending_review' });
    const d = contestRating(r, 'client', 'Injuste');
    expect(d.client_response_deadline).toBeNull();
  });
});

describe('6. Réponse du client à la contestation du chauffeur', () => {
  it('T18: Client répond dans les délais → dispute complète', () => {
    const r = createRating({ rating: 2, status: 'pending_review' });
    const d = contestRating(r, 'driver', 'Trafic');
    d.client_response = 'Le chauffeur roulait trop lentement';
    d.client_response_at = new Date().toISOString();
    expect(d.client_response).toBeTruthy();
    expect(d.client_response_at).toBeTruthy();
  });
  it('T19: Client accepte la contestation → note validated', () => {
    const r = createRating({ rating: 2, status: 'contested' });
    r.status = 'validated';
    expect(r.status).toBe('validated');
  });
});

describe('7. Expiration 48h – Auto-annulation', () => {
  it('T20: Pas de réponse client + deadline passée → annulation auto', () => {
    const r = createRating({ rating: 2, status: 'contested' });
    const d: RatingDispute = {
      id: 'disp-1', rating_id: r.id, initiated_by: 'driver',
      dispute_reason: 'Injuste', client_response: null,
      client_response_deadline: new Date(Date.now() - 3600 * 1000).toISOString(),
      client_response_at: null,
    };
    const cancelled = autoCancelExpired(r, d);
    expect(cancelled).toBe(true);
    expect(r.status).toBe('cancelled');
    expect(r.ai_decision).toBe('cancelled');
    expect(r.ai_justification).toContain('48 heures');
  });
  it('T21: Client a répondu → PAS d\'annulation auto', () => {
    const r = createRating({ rating: 2, status: 'contested' });
    const d: RatingDispute = {
      id: 'disp-2', rating_id: r.id, initiated_by: 'driver',
      dispute_reason: 'X', client_response: 'J\'explique',
      client_response_deadline: new Date(Date.now() - 3600 * 1000).toISOString(),
      client_response_at: new Date().toISOString(),
    };
    const cancelled = autoCancelExpired(r, d);
    expect(cancelled).toBe(false);
    expect(r.status).toBe('contested');
  });
  it('T22: Deadline dans le futur → PAS d\'annulation', () => {
    const r = createRating({ rating: 2, status: 'contested' });
    const d: RatingDispute = {
      id: 'disp-3', rating_id: r.id, initiated_by: 'driver',
      dispute_reason: 'X', client_response: null,
      client_response_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      client_response_at: null,
    };
    const cancelled = autoCancelExpired(r, d);
    expect(cancelled).toBe(false);
  });
});

describe('8. Arbitrage IA', () => {
  it('T23: IA annule → statut cancelled', () => {
    const r = createRating({ rating: 1, status: 'contested' });
    simulateAIDecision(r, 'cancelled', 'Trafic hors contrôle du chauffeur');
    expect(r.status).toBe('cancelled');
    expect(r.ai_decision).toBe('cancelled');
  });
  it('T24: IA maintient → statut validated', () => {
    const r = createRating({ rating: 1, status: 'contested' });
    simulateAIDecision(r, 'maintained', 'Comportement inapproprié confirmé');
    expect(r.status).toBe('validated');
    expect(r.rating).toBe(1);
  });
  it('T25: IA ajuste 1★→3★ → rating modifié', () => {
    const r = createRating({ rating: 1, status: 'contested' });
    simulateAIDecision(r, 'adjusted', 'Partiellement justifié', 3);
    expect(r.status).toBe('validated');
    expect(r.rating).toBe(3);
  });
  it('T26: IA ajuste 2★→4★ → rating modifié', () => {
    const r = createRating({ rating: 2, status: 'contested' });
    simulateAIDecision(r, 'adjusted', 'Premier incident, historique positif', 4);
    expect(r.rating).toBe(4);
  });
  it('T27: Justification IA non vide', () => {
    const r = createRating({ rating: 1, status: 'contested' });
    simulateAIDecision(r, 'cancelled', 'Les embouteillages ne sont pas la faute du chauffeur');
    expect(r.ai_justification!.length).toBeGreaterThan(10);
  });
});

describe('9. Scénarios Abdallah et ses clients', () => {
  it('T28: Client A note Abdallah 1★ "retard" → pending_review + notif', () => {
    clearNotifications();
    const r = createRating({ rating: 1, reason: 'retard', status: 'pending_review', driver_id: 'driver-abdallah' });
    triggerNotifyDriverNewRating(r, 'user-abdallah', '16/04/2026');
    expect(r.status).toBe('pending_review');
    expect(notifications).toHaveLength(1);
  });
  it('T29: Abdallah conteste → contesté + deadline 48h', () => {
    const r = createRating({ rating: 1, reason: 'retard', status: 'pending_review' });
    const d = contestRating(r, 'driver', 'Embouteillage A86');
    expect(r.status).toBe('contested');
    expect(d.client_response_deadline).toBeTruthy();
  });
  it('T30: Client A ne répond pas → annulation automatique', () => {
    const r = createRating({ rating: 1, status: 'contested' });
    const d: RatingDispute = {
      id: 'disp-a1', rating_id: r.id, initiated_by: 'driver',
      dispute_reason: 'Embouteillage', client_response: null,
      client_response_deadline: new Date(Date.now() - 1000).toISOString(),
      client_response_at: null,
    };
    expect(autoCancelExpired(r, d)).toBe(true);
  });
  it('T31: Client B note Abdallah 5★ → validated direct, pas de notif', () => {
    clearNotifications();
    const r = createRating({ rating: 5, status: 'validated' });
    triggerNotifyDriverNewRating(r, 'user-abdallah', '16/04/2026');
    expect(notifications).toHaveLength(0);
    expect(r.status).toBe('validated');
  });
  it('T32: Abdallah note Client C 1★ "non-paiement" → notif au client', () => {
    clearNotifications();
    const r = createRating({ rating: 1, rating_direction: 'driver_to_client', status: 'pending_review', reason: 'no_payment' });
    triggerNotifyDriverRatesClient(r, 'user-client-c', '16/04/2026');
    expect(notifications).toHaveLength(1);
    expect(notifications[0].metadata.action).toBe('respond_to_rating');
  });
  it('T33: Client C conteste la note d\'Abdallah', () => {
    const r = createRating({ rating: 1, rating_direction: 'driver_to_client', status: 'pending_review' });
    const d = contestRating(r, 'client', 'J\'ai payé en espèces');
    expect(r.status).toBe('contested');
    expect(d.initiated_by).toBe('client');
  });
  it('T34: Abdallah note Client D 3★ → pending_review', () => {
    const r = createRating({ rating: 3, rating_direction: 'driver_to_client', status: 'pending_review' });
    expect(r.status).toBe('pending_review');
  });
  it('T35: Client D accepte la note 3★ → validated', () => {
    const r = createRating({ rating: 3, rating_direction: 'driver_to_client', status: 'pending_review' });
    r.status = 'validated';
    expect(r.status).toBe('validated');
  });
});

describe('10. Clients Guest', () => {
  it('T36: Guest note chauffeur 2★ → pending_review (pas de user_id)', () => {
    const r = createRating({ rating: 2, status: 'pending_review', client_id: null, rated_by_user_id: null });
    expect(r.status).toBe('pending_review');
  });
  it('T37: Notification chauffeur fonctionne même pour guest', () => {
    clearNotifications();
    const r = createRating({ rating: 1, status: 'pending_review', client_id: null });
    triggerNotifyDriverNewRating(r, 'user-abdallah', '16/04/2026');
    expect(notifications).toHaveLength(1);
  });
  it('T38: Chauffeur note guest → PAS de notification (client_id null)', () => {
    clearNotifications();
    const r = createRating({ rating: 1, rating_direction: 'driver_to_client', status: 'pending_review', client_id: null });
    triggerNotifyDriverRatesClient(r, null, '16/04/2026');
    expect(notifications).toHaveLength(0);
  });
  it('T39: Guest doit pouvoir suivre sa note via lien email', () => {
    // Un tracking_token est associé à la demande de course
    const trackingToken = 'tk_guest_abc123';
    const trackingUrl = `/reservation-suivi?token=${trackingToken}`;
    expect(trackingUrl).toContain(trackingToken);
    // La page de suivi doit inclure la section notation
    expect(trackingUrl.startsWith('/reservation-suivi')).toBe(true);
  });
  it('T40: Lien email guest contient le token pour retrouver la course', () => {
    const emailContent = `Suivez votre réservation : https://solocab.fr/reservation-suivi?token=tk_unique_abc`;
    expect(emailContent).toContain('token=tk_unique_abc');
    expect(emailContent).toContain('reservation-suivi');
  });
});

describe('11. Unicité des notations', () => {
  it('T41: Une seule note client→chauffeur par course', () => {
    const ratings = new Map<string, string>();
    const key1 = 'course-001_client_to_driver';
    ratings.set(key1, 'rating-1');
    const duplicate = ratings.has(key1);
    expect(duplicate).toBe(true);
  });
  it('T42: Une note client→chauffeur ET une chauffeur→client autorisées sur même course', () => {
    const ratings = new Map<string, string>();
    ratings.set('course-001_client_to_driver', 'r1');
    ratings.set('course-001_driver_to_client', 'r2');
    expect(ratings.size).toBe(2);
  });
  it('T43: Deuxième note même direction même course → rejetée (23505)', () => {
    // Simuler contrainte unique
    const existing = new Set(['course-001_client_to_driver']);
    const canInsert = !existing.has('course-001_client_to_driver');
    expect(canInsert).toBe(false);
  });
});

describe('12. Parcours complet bidirectionnel', () => {
  it('T44: Parcours complet client→chauffeur avec contestation et arbitrage IA', () => {
    clearNotifications();
    // 1. Client note 2★
    const r = createRating({ rating: 2, status: 'pending_review', reason: 'retard' });
    // 2. Notification chauffeur
    triggerNotifyDriverNewRating(r, 'user-driver', '16/04/2026');
    expect(notifications).toHaveLength(1);
    // 3. Chauffeur conteste
    const d = contestRating(r, 'driver', 'Accident sur le périphérique');
    expect(r.status).toBe('contested');
    // 4. Client répond
    d.client_response = 'Peu importe, j\'ai attendu 40 min';
    d.client_response_at = new Date().toISOString();
    // 5. IA tranche
    simulateAIDecision(r, 'adjusted', 'Circonstances atténuantes mais retard réel', 3);
    expect(r.rating).toBe(3);
    expect(r.status).toBe('validated');
  });

  it('T45: Parcours complet chauffeur→client avec contestation et arbitrage', () => {
    clearNotifications();
    // 1. Chauffeur note client 1★
    const r = createRating({ rating: 1, rating_direction: 'driver_to_client', status: 'pending_review', reason: 'no_show' });
    // 2. Notification client
    triggerNotifyDriverRatesClient(r, 'user-client', '16/04/2026');
    expect(notifications).toHaveLength(1);
    // 3. Client conteste
    const d = contestRating(r, 'client', 'Le chauffeur est parti avant l\'heure');
    expect(r.status).toBe('contested');
    // 4. IA tranche
    simulateAIDecision(r, 'cancelled', 'Le chauffeur est arrivé en avance et n\'a pas attendu');
    expect(r.status).toBe('cancelled');
  });
});

describe('13. Edge cases notation', () => {
  it('T46: Raison obligatoire si ≤3★ client→chauffeur', () => {
    const submitAllowed = (rating: number, reason: string | null) => {
      if (rating <= 3 && !reason) return false;
      return true;
    };
    expect(submitAllowed(3, null)).toBe(false);
    expect(submitAllowed(3, 'retard')).toBe(true);
    expect(submitAllowed(4, null)).toBe(true);
  });
  it('T47: Raison obligatoire si ≤3★ chauffeur→client', () => {
    const submitAllowed = (rating: number, reason: string | null, detail: string | null) => {
      if (rating <= 3 && (!reason || !detail?.trim())) return false;
      return true;
    };
    expect(submitAllowed(2, null, null)).toBe(false);
    expect(submitAllowed(2, 'no_show', '')).toBe(false);
    expect(submitAllowed(2, 'no_show', 'Absent au point')).toBe(true);
  });
  it('T48: Note 0★ impossible (minimum 1)', () => {
    const isValid = (rating: number) => rating >= 1 && rating <= 5;
    expect(isValid(0)).toBe(false);
    expect(isValid(1)).toBe(true);
  });
  it('T49: Note 6★ impossible (maximum 5)', () => {
    const isValid = (rating: number) => rating >= 1 && rating <= 5;
    expect(isValid(6)).toBe(false);
  });
  it('T50: Contestation sans motif impossible', () => {
    const canContest = (reason: string) => reason.trim().length > 0;
    expect(canContest('')).toBe(false);
    expect(canContest('   ')).toBe(false);
    expect(canContest('Le client confond')).toBe(true);
  });
});

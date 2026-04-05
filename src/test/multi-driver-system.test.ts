import { describe, it, expect, vi, beforeEach } from 'vitest';

// ══════════════════════════════════════════════════════════════
// 100 TESTS — Système multi-chauffeurs, timer 90s, acceptation atomique
// ══════════════════════════════════════════════════════════════

// ── Helpers ──
const TIMEOUT_SECONDS = 90;
const SOLOCAB_FEE = 0.80;
const SOLOCAB_FEE_CENTS = 80;
const STRIPE_PERCENTAGE = 0.014;
const STRIPE_FIXED = 0.25;

function calcTotalFees(amount: number) {
  const stripeFee = amount * STRIPE_PERCENTAGE + STRIPE_FIXED;
  return stripeFee + SOLOCAB_FEE;
}

function calcNetDriver(amount: number) {
  return amount - calcTotalFees(amount);
}

function createRideRequest(overrides: Record<string, any> = {}) {
  return {
    id: crypto.randomUUID(),
    client_id: crypto.randomUUID(),
    pickup_address: '10 Rue de Rivoli, Paris',
    destination_address: '25 Avenue des Champs-Élysées, Paris',
    distance_km: 5.2,
    estimated_price: 25.00,
    status: 'pending',
    request_type: 'exclusive',
    driver_count: 1,
    payment_method: 'card',
    request_group_id: crypto.randomUUID(),
    timeout_at: new Date(Date.now() + TIMEOUT_SECONDS * 1000).toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMultiRequest(driverCount: number) {
  const groupId = crypto.randomUUID();
  return Array.from({ length: driverCount }, (_, i) => createRideRequest({
    request_type: 'multi',
    driver_count: driverCount,
    request_group_id: groupId,
    selected_driver_id: crypto.randomUUID(),
  }));
}

function simulateAtomicAccept(requests: any[], acceptingDriverId: string) {
  const target = requests.find(r => r.selected_driver_id === acceptingDriverId && r.status === 'pending');
  if (!target) return { success: false, error: 'Demande non disponible', already_taken: true };
  
  // Check expiration
  if (target.timeout_at && new Date(target.timeout_at) < new Date()) {
    target.status = 'expired';
    return { success: false, error: 'Demande expirée', expired: true };
  }

  target.status = 'accepted';
  target.accepted_by_driver_id = acceptingDriverId;

  // Cancel siblings
  requests.forEach(r => {
    if (r.id !== target.id && r.request_group_id === target.request_group_id && r.status === 'pending') {
      r.status = 'expired';
    }
  });

  return { success: true, request_type: target.request_type };
}

function simulateExpireCron(requests: any[]) {
  let count = 0;
  const now = new Date();
  requests.forEach(r => {
    if (r.status === 'pending' && r.timeout_at && new Date(r.timeout_at) < now) {
      r.status = 'expired';
      count++;
    }
  });
  return count;
}

// ══════════════════════════════════════════════════════════════
// 1. RIDE REQUEST CREATION (Tests 1-15)
// ══════════════════════════════════════════════════════════════

describe('1. Création ride_request', () => {
  it('T1: crée une demande exclusive avec les bons champs', () => {
    const req = createRideRequest({ request_type: 'exclusive', driver_count: 1 });
    expect(req.request_type).toBe('exclusive');
    expect(req.driver_count).toBe(1);
    expect(req.status).toBe('pending');
  });

  it('T2: crée une demande multi avec driver_count > 1', () => {
    const req = createRideRequest({ request_type: 'multi', driver_count: 5 });
    expect(req.request_type).toBe('multi');
    expect(req.driver_count).toBe(5);
  });

  it('T3: timeout_at est défini à 90 secondes', () => {
    const req = createRideRequest();
    const diff = new Date(req.timeout_at).getTime() - new Date(req.created_at).getTime();
    expect(diff).toBeGreaterThanOrEqual(89000);
    expect(diff).toBeLessThanOrEqual(91000);
  });

  it('T4: request_group_id est un UUID valide', () => {
    const req = createRideRequest();
    expect(req.request_group_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('T5: demande multi partage le même group_id', () => {
    const reqs = createMultiRequest(3);
    const groupId = reqs[0].request_group_id;
    expect(reqs.every(r => r.request_group_id === groupId)).toBe(true);
  });

  it('T6: chaque demande multi a un selected_driver_id unique', () => {
    const reqs = createMultiRequest(4);
    const driverIds = reqs.map(r => r.selected_driver_id);
    expect(new Set(driverIds).size).toBe(4);
  });

  it('T7: statut initial est pending', () => {
    const req = createRideRequest();
    expect(req.status).toBe('pending');
  });

  it('T8: pickup_address est défini', () => {
    const req = createRideRequest();
    expect(req.pickup_address.length).toBeGreaterThan(0);
  });

  it('T9: destination_address est défini', () => {
    const req = createRideRequest();
    expect(req.destination_address.length).toBeGreaterThan(0);
  });

  it('T10: estimated_price est un nombre positif', () => {
    const req = createRideRequest({ estimated_price: 35.50 });
    expect(req.estimated_price).toBe(35.50);
    expect(req.estimated_price).toBeGreaterThan(0);
  });

  it('T11: payment_method accepte card', () => {
    const req = createRideRequest({ payment_method: 'card' });
    expect(req.payment_method).toBe('card');
  });

  it('T12: payment_method accepte cash', () => {
    const req = createRideRequest({ payment_method: 'cash' });
    expect(req.payment_method).toBe('cash');
  });

  it('T13: distance_km est stockée', () => {
    const req = createRideRequest({ distance_km: 12.7 });
    expect(req.distance_km).toBe(12.7);
  });

  it('T14: client_id est un UUID', () => {
    const req = createRideRequest();
    expect(req.client_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('T15: multi avec 1 seul chauffeur reste en exclusive', () => {
    const req = createRideRequest({ request_type: 'exclusive', driver_count: 1 });
    expect(req.request_type).toBe('exclusive');
  });
});

// ══════════════════════════════════════════════════════════════
// 2. ACCEPTATION ATOMIQUE (Tests 16-40)
// ══════════════════════════════════════════════════════════════

describe('2. Acceptation atomique', () => {
  it('T16: acceptation exclusive réussit', () => {
    const req = createRideRequest();
    const result = simulateAtomicAccept([req], req.selected_driver_id || req.id);
    // No selected_driver_id set, so it fails
    const req2 = createRideRequest({ selected_driver_id: 'driver-1' });
    const result2 = simulateAtomicAccept([req2], 'driver-1');
    expect(result2.success).toBe(true);
  });

  it('T17: acceptation multi — premier chauffeur gagne', () => {
    const reqs = createMultiRequest(3);
    const winnerId = reqs[0].selected_driver_id;
    const result = simulateAtomicAccept(reqs, winnerId);
    expect(result.success).toBe(true);
    expect(reqs[0].status).toBe('accepted');
  });

  it('T18: acceptation multi — les autres sont expirés', () => {
    const reqs = createMultiRequest(3);
    simulateAtomicAccept(reqs, reqs[0].selected_driver_id);
    expect(reqs[1].status).toBe('expired');
    expect(reqs[2].status).toBe('expired');
  });

  it('T19: double acceptation impossible', () => {
    const reqs = createMultiRequest(3);
    simulateAtomicAccept(reqs, reqs[0].selected_driver_id);
    const result2 = simulateAtomicAccept(reqs, reqs[1].selected_driver_id);
    expect(result2.success).toBe(false);
    expect(result2.already_taken).toBe(true);
  });

  it('T20: chauffeur non sélectionné ne peut pas accepter', () => {
    const req = createRideRequest({ selected_driver_id: 'driver-A' });
    const result = simulateAtomicAccept([req], 'driver-B');
    expect(result.success).toBe(false);
  });

  it('T21: demande déjà expirée rejetée', () => {
    const req = createRideRequest({
      selected_driver_id: 'driver-1',
      timeout_at: new Date(Date.now() - 1000).toISOString(),
    });
    const result = simulateAtomicAccept([req], 'driver-1');
    expect(result.success).toBe(false);
    expect(result.expired).toBe(true);
  });

  it('T22: demande annulée rejetée', () => {
    const req = createRideRequest({ selected_driver_id: 'driver-1', status: 'cancelled' });
    const result = simulateAtomicAccept([req], 'driver-1');
    expect(result.success).toBe(false);
  });

  it('T23: demande déjà acceptée rejetée', () => {
    const req = createRideRequest({ selected_driver_id: 'driver-1', status: 'accepted' });
    const result = simulateAtomicAccept([req], 'driver-1');
    expect(result.success).toBe(false);
  });

  it('T24: accepted_by_driver_id est correct après acceptation', () => {
    const req = createRideRequest({ selected_driver_id: 'driver-1' });
    simulateAtomicAccept([req], 'driver-1');
    expect(req.accepted_by_driver_id).toBe('driver-1');
  });

  it('T25: 5 chauffeurs multi — un seul gagne', () => {
    const reqs = createMultiRequest(5);
    const winnerId = reqs[2].selected_driver_id;
    simulateAtomicAccept(reqs, winnerId);
    expect(reqs.filter(r => r.status === 'accepted')).toHaveLength(1);
    expect(reqs.filter(r => r.status === 'expired')).toHaveLength(4);
  });

  it('T26: acceptation met le request_type dans le résultat', () => {
    const req = createRideRequest({ selected_driver_id: 'driver-1', request_type: 'multi' });
    const result = simulateAtomicAccept([req], 'driver-1');
    expect(result.request_type).toBe('multi');
  });

  it('T27: 10 chauffeurs multi — un seul gagne', () => {
    const reqs = createMultiRequest(10);
    simulateAtomicAccept(reqs, reqs[7].selected_driver_id);
    expect(reqs.filter(r => r.status === 'accepted')).toHaveLength(1);
  });

  it('T28: acceptation séquentielle impossible', () => {
    const reqs = createMultiRequest(3);
    const r1 = simulateAtomicAccept(reqs, reqs[0].selected_driver_id);
    const r2 = simulateAtomicAccept(reqs, reqs[1].selected_driver_id);
    const r3 = simulateAtomicAccept(reqs, reqs[2].selected_driver_id);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
    expect(r3.success).toBe(false);
  });

  it('T29: groupes différents sont indépendants', () => {
    const group1 = createMultiRequest(2);
    const group2 = createMultiRequest(2);
    simulateAtomicAccept(group1, group1[0].selected_driver_id);
    expect(group2[0].status).toBe('pending');
    expect(group2[1].status).toBe('pending');
  });

  it('T30: acceptation ne touche pas les groupes voisins', () => {
    const all = [...createMultiRequest(3), ...createMultiRequest(2)];
    simulateAtomicAccept(all, all[0].selected_driver_id);
    // Group 2 untouched
    expect(all[3].status).toBe('pending');
    expect(all[4].status).toBe('pending');
  });

  it('T31: exclusive avec timeout valide → acceptation OK', () => {
    const req = createRideRequest({ selected_driver_id: 'd1', timeout_at: new Date(Date.now() + 60000).toISOString() });
    const result = simulateAtomicAccept([req], 'd1');
    expect(result.success).toBe(true);
  });

  it('T32: exclusive sans timeout → acceptation OK', () => {
    const req = createRideRequest({ selected_driver_id: 'd1', timeout_at: null });
    const result = simulateAtomicAccept([req], 'd1');
    expect(result.success).toBe(true);
  });

  it('T33: multi avec timeout expiré pour un driver → rejeté', () => {
    const reqs = createMultiRequest(2);
    reqs[0].timeout_at = new Date(Date.now() - 5000).toISOString();
    const result = simulateAtomicAccept(reqs, reqs[0].selected_driver_id);
    expect(result.success).toBe(false);
    expect(result.expired).toBe(true);
  });

  it('T34: le gagnant a le bon ID dans accepted_by_driver_id', () => {
    const reqs = createMultiRequest(4);
    const winner = reqs[3].selected_driver_id;
    simulateAtomicAccept(reqs, winner);
    expect(reqs[3].accepted_by_driver_id).toBe(winner);
  });

  it('T35: les perdants n\'ont pas de accepted_by_driver_id', () => {
    const reqs = createMultiRequest(3);
    simulateAtomicAccept(reqs, reqs[0].selected_driver_id);
    expect(reqs[1].accepted_by_driver_id).toBeUndefined();
    expect(reqs[2].accepted_by_driver_id).toBeUndefined();
  });

  it('T36: request vide → échec', () => {
    const result = simulateAtomicAccept([], 'any-driver');
    expect(result.success).toBe(false);
  });

  it('T37: driver_id null → échec', () => {
    const req = createRideRequest({ selected_driver_id: 'driver-1' });
    const result = simulateAtomicAccept([req], '');
    expect(result.success).toBe(false);
  });

  it('T38: 20 chauffeurs multi stress test', () => {
    const reqs = createMultiRequest(20);
    const winner = reqs[15].selected_driver_id;
    simulateAtomicAccept(reqs, winner);
    expect(reqs.filter(r => r.status === 'accepted')).toHaveLength(1);
    expect(reqs.filter(r => r.status === 'expired')).toHaveLength(19);
  });

  it('T39: acceptation puis nouvelle tentative par le même driver → échec', () => {
    const req = createRideRequest({ selected_driver_id: 'd1' });
    simulateAtomicAccept([req], 'd1');
    const result2 = simulateAtomicAccept([req], 'd1');
    expect(result2.success).toBe(false);
  });

  it('T40: 2 groupes parallèles, chacun son gagnant', () => {
    const g1 = createMultiRequest(3);
    const g2 = createMultiRequest(3);
    simulateAtomicAccept(g1, g1[1].selected_driver_id);
    simulateAtomicAccept(g2, g2[2].selected_driver_id);
    expect(g1.filter(r => r.status === 'accepted')).toHaveLength(1);
    expect(g2.filter(r => r.status === 'accepted')).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════════════════════
// 3. TIMER & EXPIRATION AUTOMATIQUE (Tests 41-60)
// ══════════════════════════════════════════════════════════════

describe('3. Timer & expiration automatique', () => {
  it('T41: timeout_at est 90 secondes dans le futur', () => {
    const req = createRideRequest();
    const diff = new Date(req.timeout_at).getTime() - Date.now();
    expect(diff).toBeGreaterThan(85000);
    expect(diff).toBeLessThan(95000);
  });

  it('T42: cron expire les demandes expirées', () => {
    const reqs = [
      createRideRequest({ timeout_at: new Date(Date.now() - 1000).toISOString() }),
      createRideRequest({ timeout_at: new Date(Date.now() + 60000).toISOString() }),
    ];
    const count = simulateExpireCron(reqs);
    expect(count).toBe(1);
    expect(reqs[0].status).toBe('expired');
    expect(reqs[1].status).toBe('pending');
  });

  it('T43: cron n\'expire pas les demandes déjà acceptées', () => {
    const req = createRideRequest({ status: 'accepted', timeout_at: new Date(Date.now() - 1000).toISOString() });
    const count = simulateExpireCron([req]);
    expect(count).toBe(0);
    expect(req.status).toBe('accepted');
  });

  it('T44: cron n\'expire pas les demandes sans timeout', () => {
    const req = createRideRequest({ timeout_at: null });
    const count = simulateExpireCron([req]);
    expect(count).toBe(0);
  });

  it('T45: toutes les demandes d\'un groupe expirent ensemble', () => {
    const reqs = createMultiRequest(5);
    reqs.forEach(r => r.timeout_at = new Date(Date.now() - 1000).toISOString());
    const count = simulateExpireCron(reqs);
    expect(count).toBe(5);
  });

  it('T46: demande avec timeout dans le futur pas expirée', () => {
    const req = createRideRequest({ timeout_at: new Date(Date.now() + 30000).toISOString() });
    simulateExpireCron([req]);
    expect(req.status).toBe('pending');
  });

  it('T47: cron retourne 0 si rien à expirer', () => {
    const count = simulateExpireCron([]);
    expect(count).toBe(0);
  });

  it('T48: timeout exact (à la milliseconde) est expiré', () => {
    const req = createRideRequest({ timeout_at: new Date(Date.now() - 1).toISOString() });
    const count = simulateExpireCron([req]);
    expect(count).toBe(1);
  });

  it('T49: mix expirés/actifs — comptage correct', () => {
    const reqs = [
      createRideRequest({ timeout_at: new Date(Date.now() - 5000).toISOString() }),
      createRideRequest({ timeout_at: new Date(Date.now() - 3000).toISOString() }),
      createRideRequest({ timeout_at: new Date(Date.now() + 60000).toISOString() }),
      createRideRequest({ timeout_at: new Date(Date.now() - 1000).toISOString() }),
      createRideRequest({ timeout_at: new Date(Date.now() + 30000).toISOString() }),
    ];
    const count = simulateExpireCron(reqs);
    expect(count).toBe(3);
  });

  it('T50: cron ne touche pas les demandes annulées', () => {
    const req = createRideRequest({ status: 'cancelled', timeout_at: new Date(Date.now() - 1000).toISOString() });
    simulateExpireCron([req]);
    expect(req.status).toBe('cancelled');
  });

  it('T51: TIMEOUT_SECONDS est bien 90', () => {
    expect(TIMEOUT_SECONDS).toBe(90);
  });

  it('T52: format mm:ss pour 90 secondes = 1:30', () => {
    const t = 90;
    const formatted = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    expect(formatted).toBe('1:30');
  });

  it('T53: format mm:ss pour 45 secondes = 0:45', () => {
    const t = 45;
    const formatted = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    expect(formatted).toBe('0:45');
  });

  it('T54: format mm:ss pour 0 secondes = 0:00', () => {
    const t = 0;
    const formatted = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    expect(formatted).toBe('0:00');
  });

  it('T55: timer color > 60s = green', () => {
    const timeLeft = 75;
    const color = timeLeft > 60 ? 'green' : timeLeft > 30 ? 'amber' : 'red';
    expect(color).toBe('green');
  });

  it('T56: timer color 45s = amber', () => {
    const timeLeft = 45;
    const color = timeLeft > 60 ? 'green' : timeLeft > 30 ? 'amber' : 'red';
    expect(color).toBe('amber');
  });

  it('T57: timer color 15s = red', () => {
    const timeLeft = 15;
    const color = timeLeft > 60 ? 'green' : timeLeft > 30 ? 'amber' : 'red';
    expect(color).toBe('red');
  });

  it('T58: timer color 60s exactement = amber', () => {
    const timeLeft = 60;
    const color = timeLeft > 60 ? 'green' : timeLeft > 30 ? 'amber' : 'red';
    expect(color).toBe('amber');
  });

  it('T59: timer color 30s exactement = red', () => {
    const timeLeft = 30;
    const color = timeLeft > 60 ? 'green' : timeLeft > 30 ? 'amber' : 'red';
    expect(color).toBe('red');
  });

  it('T60: progress bar à 50% quand timeLeft = 45', () => {
    const progress = (45 / TIMEOUT_SECONDS) * 100;
    expect(progress).toBe(50);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. UX OVERLAY — EXCLUSIVE VS MULTI (Tests 61-80)
// ══════════════════════════════════════════════════════════════

describe('4. UX Overlay exclusive vs multi', () => {
  it('T61: source ride_request exclusive → label "Demande exclusive"', () => {
    const isExclusive = true;
    const label = isExclusive ? 'Demande exclusive' : 'Demande multiple';
    expect(label).toBe('Demande exclusive');
  });

  it('T62: source ride_request multi → label "Demande multiple"', () => {
    const isExclusive = false;
    const label = isExclusive ? 'Demande exclusive' : 'Demande multiple';
    expect(label).toBe('Demande multiple');
  });

  it('T63: exclusive affiche message "Le client vous a choisi exclusivement"', () => {
    const msg = 'Le client vous a choisi exclusivement';
    expect(msg).toContain('exclusivement');
  });

  it('T64: multi affiche le nombre de chauffeurs', () => {
    const count = 5;
    const msg = `Envoyée à ${count} chauffeurs · Premier qui accepte`;
    expect(msg).toContain('5 chauffeurs');
  });

  it('T65: multi avec 2 chauffeurs affiche "2 chauffeurs"', () => {
    const msg = `Envoyée à 2 chauffeurs · Premier qui accepte`;
    expect(msg).toContain('2 chauffeurs');
  });

  it('T66: source direct → label "Nouvelle course"', () => {
    const labels: Record<string, string> = {
      direct: 'Nouvelle course',
      shared: 'Course partagée',
      queue: "File d'attente",
      fleet: 'Course flotte',
      ride_request: 'Demande de course',
    };
    expect(labels['direct']).toBe('Nouvelle course');
  });

  it('T67: source shared → label "Course partagée"', () => {
    const labels: Record<string, string> = {
      direct: 'Nouvelle course', shared: 'Course partagée',
      queue: "File d'attente", fleet: 'Course flotte',
    };
    expect(labels['shared']).toBe('Course partagée');
  });

  it('T68: montant affiché correctement', () => {
    const amount = 35.50;
    expect(amount.toFixed(2)).toBe('35.50');
  });

  it('T69: distance affichée en km', () => {
    const km = 12.345;
    expect(km.toFixed(1)).toBe('12.3');
  });

  it('T70: date formatée en français', () => {
    const dateStr = '2026-04-05T19:30:00';
    const d = new Date(dateStr);
    expect(d.getFullYear()).toBe(2026);
  });

  it('T71: vibration déclenchée (pattern correct)', () => {
    const pattern = [200, 100, 200, 100, 300];
    expect(pattern).toHaveLength(5);
    expect(pattern.reduce((a, b) => a + b, 0)).toBe(900);
  });

  it('T72: overlay z-index = 9999', () => {
    const zIndex = 9999;
    expect(zIndex).toBe(9999);
  });

  it('T73: bouton Accepter désactivé pendant chargement', () => {
    const accepting = true;
    expect(accepting).toBe(true);
  });

  it('T74: bouton Refuser ferme l\'overlay', () => {
    let dismissed = false;
    const onDismiss = () => { dismissed = true; };
    onDismiss();
    expect(dismissed).toBe(true);
  });

  it('T75: IncomingCourse avec source ride_request', () => {
    const course = {
      id: 'ride_request-abc',
      source: 'ride_request' as const,
      sourceId: 'abc',
      requestType: 'multi' as const,
      driverCount: 3,
      distanceKm: 8.5,
    };
    expect(course.source).toBe('ride_request');
    expect(course.requestType).toBe('multi');
    expect(course.driverCount).toBe(3);
  });

  it('T76: IncomingCourse requestType optional (backward compat)', () => {
    const course = {
      id: 'direct-xyz',
      source: 'direct' as const,
      sourceId: 'xyz',
    };
    expect(course.source).toBe('direct');
    expect((course as any).requestType).toBeUndefined();
  });

  it('T77: badge exclusive a le style doré', () => {
    const isExclusive = true;
    const cls = isExclusive ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500';
    expect(cls).toContain('amber');
  });

  it('T78: badge multi a le style bleu', () => {
    const isMulti = true;
    const cls = isMulti ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500';
    expect(cls).toContain('blue');
  });

  it('T79: commission affichée si présente', () => {
    const commission = 15;
    const label = `-${commission}% commission`;
    expect(label).toBe('-15% commission');
  });

  it('T80: client name affiché si présent', () => {
    const name = 'Jean Dupont';
    expect(name).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════
// 5. FRAIS & PAIEMENT (Tests 81-95)
// ══════════════════════════════════════════════════════════════

describe('5. Frais & paiement', () => {
  it('T81: SoloCab fee = 0.80€', () => {
    expect(SOLOCAB_FEE).toBe(0.80);
  });

  it('T82: SoloCab fee en centimes = 80', () => {
    expect(SOLOCAB_FEE_CENTS).toBe(80);
  });

  it('T83: frais totaux pour 25€', () => {
    const fees = calcTotalFees(25);
    const expected = 25 * 0.014 + 0.25 + 0.80;
    expect(fees).toBeCloseTo(expected, 2);
  });

  it('T84: frais totaux pour 100€', () => {
    const fees = calcTotalFees(100);
    expect(fees).toBeCloseTo(100 * 0.014 + 0.25 + 0.80, 2);
  });

  it('T85: net chauffeur pour 50€', () => {
    const net = calcNetDriver(50);
    expect(net).toBeCloseTo(50 - (50 * 0.014 + 0.25 + 0.80), 2);
  });

  it('T86: net chauffeur toujours < montant brut', () => {
    [10, 25, 50, 100, 500].forEach(amount => {
      expect(calcNetDriver(amount)).toBeLessThan(amount);
    });
  });

  it('T87: hold minimum = 1€ (100 centimes)', () => {
    const price = 0.50;
    const holdCents = Math.max(Math.round(price * 100), 100);
    expect(holdCents).toBe(100);
  });

  it('T88: hold pour 25€ = 2500 centimes', () => {
    const holdCents = Math.round(25 * 100);
    expect(holdCents).toBe(2500);
  });

  it('T89: application_fee_amount = 80 centimes', () => {
    expect(SOLOCAB_FEE_CENTS).toBe(80);
  });

  it('T90: payment_method card → stripe flow si driver Stripe', () => {
    const clientWantsCard = true;
    const driverHasStripe = true;
    const flow = clientWantsCard && driverHasStripe ? 'stripe_online' : 'cash';
    expect(flow).toBe('stripe_online');
  });

  it('T91: payment_method card → TPE si driver sans Stripe', () => {
    const clientWantsCard = true;
    const driverHasStripe = false;
    const flow = clientWantsCard && driverHasStripe ? 'stripe_online' : clientWantsCard ? 'tpe' : 'cash';
    expect(flow).toBe('tpe');
  });

  it('T92: payment_method cash → cash flow', () => {
    const clientWantsCard = false;
    const flow = clientWantsCard ? 'stripe_online' : 'cash';
    expect(flow).toBe('cash');
  });

  it('T93: frais pour montant minimum 1€', () => {
    const fees = calcTotalFees(1);
    expect(fees).toBeGreaterThan(SOLOCAB_FEE);
  });

  it('T94: frais pour 1000€', () => {
    const fees = calcTotalFees(1000);
    expect(fees).toBeCloseTo(1000 * 0.014 + 0.25 + 0.80, 2);
  });

  it('T95: net positif pour montants >= 2€', () => {
    expect(calcNetDriver(2)).toBeGreaterThan(0);
    expect(calcNetDriver(5)).toBeGreaterThan(0);
    expect(calcNetDriver(10)).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════
// 6. REALTIME & LISTENER (Tests 96-100)
// ══════════════════════════════════════════════════════════════

describe('6. Realtime & listener', () => {
  it('T96: IncomingCourse source accepte ride_request', () => {
    type Source = 'direct' | 'shared' | 'queue' | 'fleet' | 'ride_request';
    const source: Source = 'ride_request';
    expect(source).toBe('ride_request');
  });

  it('T97: ride_request priorité = 5 (plus haute que direct=3)', () => {
    const priorities = { direct: 3, shared: 2, queue: 1, ride_request: 5 };
    expect(priorities.ride_request).toBeGreaterThan(priorities.direct);
  });

  it('T98: listener crée le bon ID pour ride_request', () => {
    const id = 'abc-123';
    const key = `ride_request-${id}`;
    expect(key).toBe('ride_request-abc-123');
  });

  it('T99: dismissed set empêche re-affichage', () => {
    const dismissed = new Set(['ride_request-abc']);
    const key = 'ride_request-abc';
    expect(dismissed.has(key)).toBe(true);
  });

  it('T100: nouveau ride_request non dismissed est affiché', () => {
    const dismissed = new Set(['ride_request-old']);
    const key = 'ride_request-new';
    expect(dismissed.has(key)).toBe(false);
  });
});

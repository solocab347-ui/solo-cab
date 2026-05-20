/**
 * Phone privacy rules for immediate rides.
 *
 * Privacy rule (driver ↔ client): On an immediate ride (no scheduled_date)
 * coming from the public marketplace, neither party should ever see the
 * other's phone number. They must communicate through the in-app chat or
 * the anonymous LiveKit VoIP call.
 *
 * Exception ("private/exclusive relationship"): When the client is exclusive
 * AND assigned to this driver (clients.is_exclusive === true and
 * clients.driver_id === drivers.id), the relationship is private and direct
 * phone contact is allowed (the parties already know each other).
 *
 * Scheduled rides (course.scheduled_date set) keep direct phone contact for
 * operational reasons (chauffeur needs to confirm pickup).
 */

export interface PhoneVisibilityInput {
  /** ISO string when present means scheduled, null means immediate */
  scheduledDate: string | null | undefined;
  /** clients.is_exclusive (registered client) */
  clientIsExclusive?: boolean | null;
  /** clients.driver_id (the driver this exclusive client is locked to, if any) */
  clientDriverId?: string | null;
  /** drivers.id of the driver currently viewing the course */
  currentDriverId?: string | null;
}

/**
 * Returns true when phone numbers may be exchanged between client and driver
 * for this course context.
 */
export function isPhoneExchangeAllowed({
  scheduledDate,
  clientIsExclusive,
  clientDriverId,
  currentDriverId,
}: PhoneVisibilityInput): boolean {
  const isImmediate = !scheduledDate;
  if (!isImmediate) return true;

  // Private (exclusive) relationship: exclusive client locked to this driver
  if (
    clientIsExclusive === true &&
    clientDriverId &&
    currentDriverId &&
    clientDriverId === currentDriverId
  ) {
    return true;
  }

  return false;
}

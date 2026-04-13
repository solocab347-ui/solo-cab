/**
 * Formats a driver's full name for public display.
 * - Exclusive clients see the full name: "Abdallah KANOUTE"
 * - Non-exclusive / public users see: "Abdallah K."
 * 
 * @param fullName - The driver's full name (e.g., "Abdallah KANOUTE")
 * @param isExclusiveClient - Whether the viewer is an exclusive client of this driver
 * @returns Formatted name string
 */
export function formatDriverName(
  fullName: string | null | undefined,
  isExclusiveClient: boolean = false
): string {
  if (!fullName) return 'Chauffeur';
  
  // Exclusive clients see full name
  if (isExclusiveClient) return fullName;
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || 'Chauffeur';
  
  // First name + first letter of last name + "."
  const firstName = parts[0];
  const lastNameInitial = parts[parts.length - 1][0]?.toUpperCase() || '';
  
  return `${firstName} ${lastNameInitial}.`;
}

/**
 * Gets initials from a name (for avatars), respecting privacy.
 * Non-exclusive: first letter of first name only.
 * Exclusive: first letter of first + last name.
 */
export function formatDriverInitials(
  fullName: string | null | undefined,
  isExclusiveClient: boolean = false
): string {
  if (!fullName) return 'C';
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return (parts[0]?.[0] || 'C').toUpperCase();
  
  if (isExclusiveClient) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

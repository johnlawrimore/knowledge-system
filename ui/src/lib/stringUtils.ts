/**
 * Derive initials from a person's name.
 *
 * - Multi-word names: first letter of first word + first letter of last word.
 * - Single-word names: first letter only.
 *
 * Always returns uppercase.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}

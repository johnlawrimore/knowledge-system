export function formatDate(value: string | null | undefined): string {
  if (!value) return 'no date';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

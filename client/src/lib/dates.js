export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

export function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${-diffDays} days ago`;
  return formatDate(iso);
}

export function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

export function isDueSoon(iso, withinDays = 3) {
  if (!iso) return false;
  const ms = new Date(iso) - new Date();
  return ms >= 0 && ms <= withinDays * 24 * 60 * 60 * 1000;
}

export function toDateInputValue(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

export function fromDateInputValue(value) {
  if (!value) return null;
  // value is "YYYY-MM-DD" — treat as local midnight, then to ISO
  return new Date(`${value}T00:00:00`).toISOString();
}

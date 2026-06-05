// Whitelists for enum-style fields + small helpers
export const ALLOWED_STATUS = new Set(['pending', 'in_progress', 'done']);
export const ALLOWED_PRIORITY = new Set(['low', 'medium', 'high']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function isValidIsoDate(value) {
  if (value === null || value === undefined || value === '') return true; // nullable
  if (typeof value !== 'string') return false;
  if (!ISO_DATE.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function asStringOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

export function validateTaskPayload(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      errors.push('title must be a non-empty string');
    } else {
      out.title = body.title.trim();
    }
  }

  if (body.description !== undefined) {
    out.description = asStringOrNull(body.description);
  } else if (!partial) {
    out.description = null;
  }

  if (body.status !== undefined) {
    if (!ALLOWED_STATUS.has(body.status)) {
      errors.push(`status must be one of: ${[...ALLOWED_STATUS].join(', ')}`);
    } else {
      out.status = body.status;
    }
  } else if (!partial) {
    out.status = 'pending';
  }

  if (body.priority !== undefined) {
    if (!ALLOWED_PRIORITY.has(body.priority)) {
      errors.push(`priority must be one of: ${[...ALLOWED_PRIORITY].join(', ')}`);
    } else {
      out.priority = body.priority;
    }
  } else if (!partial) {
    out.priority = 'medium';
  }

  if (body.due_date !== undefined) {
    if (!isValidIsoDate(body.due_date)) {
      errors.push('due_date must be a valid ISO date string or null');
    } else {
      out.due_date = body.due_date ? new Date(body.due_date).toISOString() : null;
    }
  } else if (!partial) {
    out.due_date = null;
  }

  return { errors, data: out };
}

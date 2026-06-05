import { useState } from 'react';

const EMPTY = { title: '', description: '', status: 'pending', priority: 'medium', due_date: '' };

export default function TaskForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handle = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('title is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date ? new Date(`${form.due_date}T00:00:00`).toISOString() : null,
      });
      setForm(EMPTY);
    } catch (err) {
      setError(err.message || 'failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="field fullRow">
        <label className="fieldLabel" htmlFor="task-title">Title</label>
        <input
          id="task-title"
          className="input"
          type="text"
          value={form.title}
          onChange={handle('title')}
          placeholder="e.g. Ship the design system extraction"
          autoFocus
        />
      </div>

      <div className="field fullRow">
        <label className="fieldLabel" htmlFor="task-description">Description</label>
        <textarea
          id="task-description"
          className="textarea"
          rows={2}
          value={form.description}
          onChange={handle('description')}
          placeholder="Optional context, links, acceptance criteria…"
        />
      </div>

      <div className="field">
        <label className="fieldLabel" htmlFor="task-priority">Priority</label>
        <select id="task-priority" className="select" value={form.priority} onChange={handle('priority')}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
      </div>

      <div className="field">
        <label className="fieldLabel" htmlFor="task-status">Status</label>
        <select id="task-status" className="select" value={form.status} onChange={handle('status')}>
          <option value="pending">pending</option>
          <option value="in_progress">in progress</option>
          <option value="done">done</option>
        </select>
      </div>

      <div className="field">
        <label className="fieldLabel" htmlFor="task-due">Due date</label>
        <input
          id="task-due"
          className="input"
          type="date"
          value={form.due_date}
          onChange={handle('due_date')}
        />
      </div>

      <div className="field" style={{ justifyContent: 'flex-end' }}>
        <label className="fieldLabel">&nbsp;</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {onCancel && (
            <button type="button" className="ghostButton" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
          )}
          <button type="submit" className="primaryButton" disabled={submitting || !form.title.trim()}>
            {submitting ? 'Creating…' : 'Add task'}
          </button>
        </div>
      </div>

      {error && <div className="formError">{error}</div>}
    </form>
  );
}

import { formatDate, formatRelative, isOverdue, isDueSoon } from '../lib/dates.js';

const STATUS_LABELS = {
  pending: 'pending',
  in_progress: 'in progress',
  done: 'done',
};

export default function TaskRow({ task, onToggleDone, onStatusChange, onDelete }) {
  const isDone = task.status === 'done';
  const overdue = !isDone && isOverdue(task.due_date);
  const dueSoon = !isDone && !overdue && isDueSoon(task.due_date);

  return (
    <li className="taskRow">
      <button
        type="button"
        className={`checkbox ${isDone ? 'checked' : ''}`}
        onClick={() => onToggleDone(task)}
        aria-label={isDone ? 'mark as not done' : 'mark as done'}
        aria-pressed={isDone}
      >
        {isDone && <CheckIcon />}
      </button>

      <div className="taskBody">
        <div className={`taskTitle ${isDone ? 'done' : ''}`}>{task.title}</div>
        <p className={`taskDescription ${task.description ? '' : 'placeholder'}`}>
          {task.description || '—'}
        </p>
        <div className="taskMeta">
          <span className={`badge priority-${task.priority}`}>{task.priority}</span>
          <span className={`badge status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
          {task.due_date && (
            <span
              className={`badge ${overdue ? 'due-overdue' : dueSoon ? 'due-soon' : 'due-future'}`}
              title={formatDate(task.due_date)}
            >
              {overdue ? `overdue · ${formatRelative(task.due_date)}` : `due ${formatRelative(task.due_date)}`}
            </span>
          )}
        </div>
      </div>

      <select
        className="statusSelect"
        value={task.status}
        onChange={(e) => onStatusChange(task, e.target.value)}
        aria-label="change status"
      >
        <option value="pending">pending</option>
        <option value="in_progress">in progress</option>
        <option value="done">done</option>
      </select>

      <div className="taskActions">
        <button
          type="button"
          className="iconButton danger"
          onClick={() => {
            if (confirm(`Delete "${task.title}"?`)) onDelete(task);
          }}
          aria-label="delete task"
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4h10M6 4V2.5A.5.5 0 0 1 6.5 2h3a.5.5 0 0 1 .5.5V4M5 4l.5 9a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L11 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { formatDate, formatRelative, isOverdue, isDueSoon } from '../lib/dates.js';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'pending' },
  { value: 'in_progress', label: 'in progress' },
  { value: 'done', label: 'done' },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((option) => [option.value, option.label]));

function MetaDot() {
  return <span className="metaDot" aria-hidden="true">·</span>;
}

export default function TaskRow({ task, onStatusChange, onDelete }) {
  const isDone = task.status === 'done';
  const overdue = !isDone && isOverdue(task.due_date);
  const dueSoon = !isDone && !overdue && isDueSoon(task.due_date);
  const dueLabel = overdue ? `overdue · ${formatRelative(task.due_date)}` : `due ${formatRelative(task.due_date)}`;

  return (
    <li className="taskRow">
      <div className="taskBody">
        <div className="taskHead">
          <div className={`taskTitle ${isDone ? 'done' : ''}`}>{task.title}</div>
          <StatusPicker
            task={task}
            value={task.status}
            onChange={(status) => onStatusChange(task, status)}
            onDelete={onDelete}
          />
        </div>

        <p className={`taskDescription ${task.description ? '' : 'placeholder'}`}>
          {task.description || 'No description provided'}
        </p>

        <div className="taskMeta">
          <span className={`metaTag priority-${task.priority}`}>{task.priority}</span>
          <MetaDot />
          <span className={`metaTag status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
          {task.due_date && (
            <>
              <MetaDot />
              <span
                className={`metaTag ${overdue ? 'due-overdue' : dueSoon ? 'due-soon' : 'due-future'}`}
                title={formatDate(task.due_date)}
              >
                {dueLabel}
              </span>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function StatusPicker({ task, value, onChange, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const pickerRef = useRef(null);
  const menuId = useId();
  const currentLabel = STATUS_LABELS[value];

  useEffect(() => {
    if (!open) return undefined;

    const close = () => {
      setOpen(false);
      setConfirmingDelete(false);
    };

    const handlePointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target)) close();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setConfirmingDelete(false);
  };

  const commitStatus = (nextStatus) => {
    close();
    if (nextStatus !== value) onChange(nextStatus);
  };

  const confirmDelete = () => {
    close();
    onDelete(task);
  };

  return (
    <div className="statusPicker" ref={pickerRef}>
      <button
        type="button"
        className={`statusPickerTrigger status-${value}`}
        aria-label="change status or delete task"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setOpen((next) => !next);
          setConfirmingDelete(false);
        }}
      >
        <span className="statusPickerDot" aria-hidden="true" />
        <span>{currentLabel}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="statusPickerMenu" id={menuId} role="menu" aria-label={`status and actions for ${task.title}`}>
          {confirmingDelete ? (
            <div className="statusDeleteConfirm" role="group" aria-label="confirm task deletion">
              <div className="statusDeleteConfirmText">Delete this task?</div>
              <div className="statusDeleteConfirmActions">
                <button type="button" className="statusPickerAction" onClick={close}>
                  Cancel
                </button>
                <button type="button" className="statusPickerAction danger" onClick={confirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`statusPickerOption status-${option.value} ${option.value === value ? 'selected' : ''}`}
                  role="menuitemradio"
                  aria-checked={option.value === value}
                  onClick={() => commitStatus(option.value)}
                >
                  <span className="statusPickerDot" aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              ))}
              <div className="statusPickerSeparator" role="separator" />
              <button
                type="button"
                className="statusPickerAction danger"
                role="menuitem"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete task
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="statusPickerChevron" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.25 3.75L5 6.25L7.75 3.75" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

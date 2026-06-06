const FILTERS = [
  { id: 'all', label: 'All tasks' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

export default function Sidebar({ stats, filter, onFilterChange, tasks }) {
  const counts = {
    all: tasks.length,
    pending: stats.pending,
    in_progress: stats.in_progress,
    done: stats.done,
  };

  return (
    <aside className="sidebar" aria-label="filters and stats">
      <div>
        <div className="sidebarHeading">Overview</div>
        <div className="statList" style={{ marginTop: 'var(--space-3)' }}>
          <Stat label="Total" value={stats.total} />
          <Stat label="Pending" value={stats.pending} />
          <Stat label="In progress" value={stats.in_progress} accent />
          <Stat label="Done" value={stats.done} />
          <Stat label="High priority" value={stats.high_priority} />
          <Stat label="Overdue" value={stats.overdue} danger={stats.overdue > 0} />
        </div>
      </div>

      <div>
        <div className="sidebarHeading">Filter</div>
        <div className="filterGroup" style={{ marginTop: 'var(--space-3)' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`filterButton ${filter === f.id ? 'active' : ''}`}
              onClick={() => onFilterChange(f.id)}
            >
              <span>{f.label}</span>
              <span className="filterCount">{String(counts[f.id] ?? 0).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Stat({ label, value, accent, danger }) {
  return (
    <div className="stat">
      <span className="statLabel">{label}</span>
      <span className={`statValue ${accent ? 'accent' : ''} ${danger ? 'danger' : ''}`}>
        {String(value ?? 0).padStart(2, '0')}
      </span>
    </div>
  );
}

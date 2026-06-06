import { useMemo, useState } from 'react';
import TaskForm from './components/TaskForm.jsx';
import TaskRow from './components/TaskRow.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useTasks, useStats, useServerHealth } from './lib/hooks.js';

export default function App() {
  const { tasks, loading, error, createTask, updateTask, deleteTask, reload } = useTasks();
  const { stats, reload: reloadStats } = useStats([tasks.length]);
  const online = useServerHealth();

  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const handleCreate = async (body) => {
    await createTask(body);
    await reloadStats();
    setShowForm(false);
  };

  const handleStatusChange = async (task, status) => {
    await updateTask(task.id, { status });
    await reloadStats();
  };

  const handleDelete = async (task) => {
    await deleteTask(task.id);
    await reloadStats();
  };

  const filterLabel = {
    all: 'All tasks',
    pending: 'Pending',
    in_progress: 'In progress',
    done: 'Done',
  }[filter];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark">~</span>
          <span className="brandName">hermes / todo</span>
        </div>
        <div className="topbarMeta">
          <span className={`connectionDot ${online ? '' : 'off'}`} aria-hidden="true" />
          <span>{online ? 'connected' : 'offline'}</span>
          <span aria-hidden="true">·</span>
          <span>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</span>
        </div>
      </header>

      <div className="shell">
        <Sidebar
          stats={stats}
          filter={filter}
          onFilterChange={setFilter}
          tasks={tasks}
        />

        <main className="content">
          <div className="contentHead">
            <div>
              <div className="contentSubtitle">viewing</div>
              <h1 className="contentTitle">{filterLabel}</h1>
            </div>
            <div className="contentActions">
              <button type="button" className="ghostButton compactButton" onClick={reload} disabled={loading}>
                Refresh
              </button>
              <button
                type="button"
                className="primaryButton compactButton"
                onClick={() => setShowForm((s) => !s)}
                aria-expanded={showForm}
              >
                {showForm ? 'Close' : '+ New task'}
              </button>
            </div>
          </div>

          {showForm && (
            <TaskForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          )}

          {error && (
            <div className="formError" role="alert">
              {error.message || 'failed to load tasks'}
            </div>
          )}

          {loading && tasks.length === 0 ? (
            <div className="state">
              <div className="spinner" aria-hidden="true" />
              <span>loading tasks</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="state">
              <span>{filter === 'all' ? 'No tasks yet — create one to start' : `No ${filterLabel.toLowerCase()} tasks`}</span>
            </div>
          ) : (
            <ul className="taskList">
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}

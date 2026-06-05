import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

/**
 * useTasks — fetches and mutates the task collection.
 * Returns { tasks, loading, error, reload, createTask, updateTask, deleteTask }.
 */
export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listTasks();
      setTasks(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const createTask = useCallback(async (body) => {
    const res = await api.createTask(body);
    setTasks((prev) => [res.data, ...prev]);
    return res.data;
  }, []);

  const updateTask = useCallback(async (id, body) => {
    const res = await api.updateTask(id, body);
    setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    return res.data;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { tasks, loading, error, reload, createTask, updateTask, deleteTask };
}

/**
 * useStats — aggregate counts (independent fetch).
 */
export function useStats(dependencies = []) {
  const [stats, setStats] = useState({
    total: 0, pending: 0, in_progress: 0, done: 0,
    high_priority: 0, overdue: 0,
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getStats();
      setStats(res.data);
    } catch {
      // Surface as zeros; the tasks error will tell the user more.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [reload, ...dependencies]);

  return { stats, loading, reload };
}

/**
 * useServerHealth — pings /api/health to drive the connection dot.
 */
export function useServerHealth() {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const res = await fetch('/api/health');
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    ping();
    const id = setInterval(ping, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return online;
}

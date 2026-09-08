"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { notificationRepository as repository, sessionOwner, type AppNotification } from './repository';

export function useNotificationHistory() {
  const pathname = usePathname();
  const [history, setHistory] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);
  const owner = useRef<string | null>(null);
  const items = useRef<AppNotification[]>([]);
  const reload = useCallback(() => {
    setLoading(true);
    try {
      owner.current = sessionOwner();
      items.current = owner.current ? repository.load(owner.current) : [];
      setHistory(items.current);
      setError(false);
    } catch { items.current = []; setHistory([]); setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(reload, 0);
    const sync = () => { setOffline(!navigator.onLine); reload(); };
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener('storage', sync);
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    const statusTimer = setTimeout(online, 0);
    return () => { clearTimeout(timer); clearTimeout(statusTimer); window.removeEventListener('storage', sync); window.removeEventListener('online', online); window.removeEventListener('offline', online); };
  }, [pathname, reload]);
  const change = useCallback((update: (current: AppNotification[]) => AppNotification[]) => {
    try {
      const currentOwner = sessionOwner();
      if (!currentOwner) { owner.current = null; items.current = []; setHistory([]); return false; }
      if (owner.current !== currentOwner) { owner.current = currentOwner; items.current = repository.load(currentOwner); }
      // Read current disk state before writing so another tab's read status is preserved.
      const disk = repository.load(currentOwner);
      const next = update(disk).sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,200);
      repository.save(currentOwner, next);
      items.current = next; setHistory(next); setError(false);
      return true;
    } catch { setError(true); return false; }
  }, []);
  const add = useCallback((item: AppNotification) => change(current => current.some(n => n.id === item.id) ? current : [item, ...current]), [change]);
  const markRead = useCallback((id?: string) => change(current => current.map(n => (!id || n.id === id) && !n.read ? { ...n, read: true, readAt: new Date().toISOString() } : n)), [change]);
  const remove = useCallback((id: string) => change(current => current.filter(n => n.id !== id)), [change]);
  const removeAll = useCallback(() => change(() => []), [change]);
  return { history, loading, error, offline, reload, add, markRead, remove, removeAll, unreadCount: history.filter(n => !n.read).length };
}

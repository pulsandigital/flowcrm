import { useState, useCallback } from 'react';
import type { ToastVariant } from '../components/ui/toast';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

// Simple singleton store for toasts
let listeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];

function notify(toasts: ToastItem[]) {
  listeners.forEach(l => l(toasts));
}

export function toast(opts: Omit<ToastItem, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { ...opts, id }];
  notify(toasts);
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify(toasts);
  }, 4000);
}

toast.success = (title: string, description?: string) =>
  toast({ title, description, variant: 'success' });

toast.error = (title: string, description?: string) =>
  toast({ title, description, variant: 'error' });

toast.info = (title: string, description?: string) =>
  toast({ title, description, variant: 'info' });

export function useToastState() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const subscribe = useCallback(() => {
    const handler = (t: ToastItem[]) => setItems([...t]);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter(l => l !== handler);
    };
  }, []);

  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  return items;
}

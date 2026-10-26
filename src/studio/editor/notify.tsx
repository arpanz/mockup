import { useEffect } from 'react';
import { useToast, type ToastData } from '../ui';

type Notify = (toast: Omit<ToastData, 'id'>) => void;
let current: Notify | null = null;

/** Shows a toast from code that lives outside the ToastProvider (keyboard shortcuts, store actions). */
export const notify: Notify = (toast) => current?.(toast);

/** Mount once inside ToastProvider so `notify` has somewhere to go. */
export function NotifyBridge() {
  const toast = useToast();
  useEffect(() => {
    current = toast;
    return () => { current = null; };
  }, [toast]);
  return null;
}

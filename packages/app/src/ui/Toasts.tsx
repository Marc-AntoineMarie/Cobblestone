import { useSession, useStore } from './hooks';

export function Toasts() {
  const session = useSession();
  const toasts = useStore(session.ui, (s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="toasts" role="region" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast is-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
          {toast.text}
        </div>
      ))}
    </div>
  );
}

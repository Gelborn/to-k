import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  titleId?: string;
  /** optional: lets caller pick the first focused element */
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  titleId,
  initialFocusRef,
}) => {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);          // ← keep latest handler

  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const labelId = React.useMemo(
    () => titleId || `modal-title-${Math.random().toString(36).slice(2)}`,
    [titleId]
  );

  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);

    // Focus once per open: prefer provided ref, else first focusable descendant
    const focusTarget =
      initialFocusRef?.current ??
      dialogRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
      );

    // Only steal focus if nothing inside is already focused
    const active = document.activeElement as HTMLElement | null;
    const containsActive = !!active && dialogRef.current?.contains(active);
    if (!containsActive) focusTarget?.focus?.();

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]); // ← only depends on isOpen

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onCloseRef.current(); // more robust
        }}
      />

      {/* Centered dialog container */}
      <div className="fixed inset-0 grid place-items-center px-4 py-8">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          tabIndex={-1}
          className={[
            'w-full', sizes[size],
            'transition-all transform rounded-2xl shadow-2xl animate-scale-in',
            'border border-zinc-200 bg-white text-zinc-900',
            'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100',
            'p-6'
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 id={labelId} className="text-xl font-bold tracking-tight">{title}</h3>
            <button
              onClick={() => onCloseRef.current()}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition
                         dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

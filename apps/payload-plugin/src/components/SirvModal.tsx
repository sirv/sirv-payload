'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon } from './dam/icons.js';

/**
 * Lightweight fixed-overlay modal. Self-contained (no @faceless-ui/modal dependency, no portal
 * provider needed), so it renders reliably inside the Payload admin form. Closes on Escape and
 * on backdrop click.
 */
export function SirvModal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a convenience; Escape + the Close button provide keyboard access.
    <div
      className="sirv-modal__backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: a role="dialog" div is the intended pattern for this lightweight overlay. */}
      <div className="sirv-modal" role="dialog" aria-modal="true" aria-label={title ?? 'Sirv'}>
        <div className="sirv-modal__header">
          <span className="sirv-modal__title">{title ?? 'Sirv media'}</span>
          <button
            type="button"
            className="sirv-modal__close"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="sirv-modal__body">{children}</div>
      </div>
    </div>
  );
}

export default SirvModal;

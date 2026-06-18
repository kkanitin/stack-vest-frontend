import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  ariaLabel?: string;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, maxWidth = 460, ariaLabel }) => {
  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const label = ariaLabel ?? (typeof title === 'string' ? title : undefined);

  return createPortal(
    <div
      className="sv-modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sv-modal-panel" style={{ maxWidth }} role="dialog" aria-modal="true" aria-label={label}>
        {title != null && (
          <div className="sv-modal-head">
            <div className="sv-modal-title">{title}</div>
            <button className="sv-modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;

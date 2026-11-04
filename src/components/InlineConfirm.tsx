import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import './InlineConfirm.css';

interface Props {
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Styles the confirm button as destructive (e.g. delete). */
  danger?: boolean;
  busy?: boolean;
  className?: string;
}

/**
 * An in-page confirmation (instead of `window.confirm`): a message with confirm and cancel
 * buttons. The cancel button takes focus so Enter never confirms by accident; Escape cancels.
 */
const InlineConfirm: React.FC<Props> = ({
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  busy = false,
  className,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className={`inline-confirm${className ? ` ${className}` : ''}`}
      role="alertdialog"
      aria-label={typeof message === 'string' ? message : confirmLabel}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCancel();
        }
      }}
      onClick={e => {
        // Inside a link card, a click here must not open the link.
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <p className="inline-confirm-msg">{message}</p>
      <div className="inline-confirm-actions">
        <Button ref={cancelRef} type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={danger ? 'destructive' : 'default'}
          size="sm"
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
};

export default InlineConfirm;

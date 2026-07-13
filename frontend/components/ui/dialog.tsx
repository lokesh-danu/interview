'use client';

import { useEffect, useRef, useCallback, HTMLAttributes } from 'react';

interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
}

function Dialog({ open, onClose, children, className = '', ...props }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={`relative z-10 mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

Dialog.displayName = 'Dialog';

interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {}

function DialogHeader({ className = '', ...props }: DialogHeaderProps) {
  return (
    <div className={`mb-4 ${className}`} {...props} />
  );
}

DialogHeader.displayName = 'DialogHeader';

interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

function DialogTitle({ className = '', ...props }: DialogTitleProps) {
  return (
    <h2
      className={`text-lg font-semibold text-gray-900 ${className}`}
      {...props}
    />
  );
}

DialogTitle.displayName = 'DialogTitle';

interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

function DialogDescription({ className = '', ...props }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-500 ${className}`} {...props} />
  );
}

DialogDescription.displayName = 'DialogDescription';

interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {}

function DialogFooter({ className = '', ...props }: DialogFooterProps) {
  return (
    <div className={`mt-6 flex justify-end gap-3 ${className}`} {...props} />
  );
}

DialogFooter.displayName = 'DialogFooter';

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
export type { DialogProps };

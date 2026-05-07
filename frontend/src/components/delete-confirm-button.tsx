'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type DeleteConfirmButtonProps = {
  itemName: string;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  children: React.ReactElement;
};

export function DeleteConfirmButton({
  itemName,
  onConfirm,
  title = 'Delete item',
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  children,
}: DeleteConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="bg-[#0a1f1f] border-white/10 text-white rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-black uppercase tracking-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-white/70">
            {description ?? `Do you really want to delete ${itemName}?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeleting}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? `${confirmLabel}...` : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

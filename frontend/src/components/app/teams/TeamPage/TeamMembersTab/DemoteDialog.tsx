import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';

interface DemoteDialogProps {
  target: { userId: string; name: string; action: string } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string) => void;
}

const DemoteDialog: React.FC<DemoteDialogProps> = ({ target, onOpenChange, onConfirm }) => {
  return (
    <AlertDialog open={target?.action === 'demote'} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Demote to Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to demote <strong>{target?.name}</strong> to a regular member?
            They will lose all owner management rights.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (target) {
                onConfirm(target.userId);
              }
            }}
          >
            Demote
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DemoteDialog;

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

interface KickDialogProps {
  target: { userId: string; name: string; action: string } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string) => void;
}

const KickDialog: React.FC<KickDialogProps> = ({ target, onOpenChange, onConfirm }) => {
  return (
    <AlertDialog open={target?.action === 'kick'} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kick Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{target?.name}</strong> from this team? They
            will lose access to all team resources.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (target) {
                onConfirm(target.userId);
              }
            }}
          >
            Kick
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default KickDialog;

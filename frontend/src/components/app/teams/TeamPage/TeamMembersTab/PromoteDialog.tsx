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

interface PromoteDialogProps {
  target: { userId: string; name: string; action: string } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string) => void;
}

const PromoteDialog: React.FC<PromoteDialogProps> = ({ target, onOpenChange, onConfirm }) => {
  return (
    <AlertDialog open={target?.action === 'promote'} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Promote to Owner</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to promote <strong>{target?.name}</strong> to owner? They will
            have full management rights over this team.
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
            Promote
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PromoteDialog;

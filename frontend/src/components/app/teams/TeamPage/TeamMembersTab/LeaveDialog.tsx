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

interface LeaveDialogProps {
  target: { userId: string; name: string; action: string } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string) => void;
}

const LeaveDialog: React.FC<LeaveDialogProps> = ({ target, onOpenChange, onConfirm }) => {
  return (
    <AlertDialog open={target?.action === 'leave'} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to leave this team? You will lose access to all team resources and
            will need to request to join again.
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
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LeaveDialog;

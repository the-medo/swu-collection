import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Route } from '@/routes/__root.tsx';
import CardDetail from '@/components/app/cards/CardDetail/CardDetail.tsx';

interface CardDetailDialogProps {}

const CardDetailDialog: React.FC<CardDetailDialogProps> = () => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  const modalCardId = search.modalCardId;

  if (!modalCardId) return null;

  return (
    <Dialog
      trigger={null}
      open={true}
      contentClassName={`md:max-w-[90%] min-h-[90%]`}
      onOpenChange={o => {
        if (!o) {
          navigate({
            search: prev => ({ ...prev, modalCardId: undefined }),
          });
        }
      }}
    >
      <CardDetail cardId={modalCardId} />
    </Dialog>
  );
};

export default CardDetailDialog;

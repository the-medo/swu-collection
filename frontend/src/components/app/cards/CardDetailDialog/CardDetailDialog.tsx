import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import Dialog from '@/components/app/global/Dialog.tsx';
import CardDetail from '@/components/app/cards/CardDetail/CardDetail.tsx';

const CardDetailDialog: React.FC = () => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  const modalCardId = search.modalCardId;

  if (!modalCardId) return null;

  return (
    <Dialog
      trigger={null}
      open={true}
      contentClassName={`w-screen h-screen md:max-w-[90%] min-h-[90%]`}
      onOpenChange={o => {
        if (!o) {
          navigate({
            to: '.',
            search: prev => ({
              ...prev,
              modalCardId: undefined,
              modalCardTab: undefined,
              modalCardVariantId: undefined,
            }),
            resetScroll: false,
          });
        }
      }}
      size="large"
    >
      <CardDetail
        cardId={modalCardId}
        tab={search.modalCardTab ?? 'details'}
        variantId={search.modalCardVariantId}
        onTabChange={tab =>
          void navigate({
            to: '.',
            search: previous => ({
              ...previous,
              modalCardTab: tab === 'details' ? undefined : tab,
            }),
            resetScroll: false,
          })
        }
        onVariantChange={variantId =>
          void navigate({
            to: '.',
            search: previous => ({ ...previous, modalCardVariantId: variantId }),
            resetScroll: false,
          })
        }
      />
    </Dialog>
  );
};

export default CardDetailDialog;

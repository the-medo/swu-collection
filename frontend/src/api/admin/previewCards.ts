import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../lib/swu-resources/types.ts';

export type PreviewCardStatus = 'active' | 'migrated' | 'archived';
export type PreviewCardPayload = CardDataWithVariants<CardListVariants> & {
  preview: true;
  previewStatus: 'active';
  karabast_id?: string;
};

export type AdminPreviewCardRow = {
  id: string;
  cardId: string;
  status: PreviewCardStatus;
  officialCardId: string | null;
  payload: PreviewCardPayload;
  createdAt: string;
  updatedAt: string;
  validationError: string | null;
};

export type PreviewCardsResponse = {
  data: AdminPreviewCardRow[];
  template: PreviewCardPayload;
};

export type SavePreviewCardInput = {
  id?: string;
  cardId?: string;
  status: PreviewCardStatus;
  officialCardId?: string | null;
  payload: unknown;
};

export type UploadPreviewCardImageInput = {
  id: string;
  file: File;
  side: 'front' | 'back';
  variantId?: string;
};

export type UploadPreviewCardImageResult = {
  image: string;
  horizontal: boolean;
};

const previewCardsQueryKey = ['admin', 'preview-cards'] as const;

async function readApiError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => undefined)) as
    | { message?: string; error?: string }
    | undefined;
  return new Error(body?.error || body?.message || fallback);
}

export function usePreviewCards() {
  return useQuery<PreviewCardsResponse>({
    queryKey: previewCardsQueryKey,
    queryFn: async () => {
      const response = await api.admin['preview-cards'].$get();
      if (!response.ok) {
        throw await readApiError(response, 'Failed to load preview cards');
      }

      return (await response.json()) as PreviewCardsResponse;
    },
  });
}

export function useSavePreviewCard() {
  const queryClient = useQueryClient();

  return useMutation<AdminPreviewCardRow, Error, SavePreviewCardInput>({
    mutationFn: async input => {
      const body = {
        cardId: input.cardId,
        status: input.status,
        officialCardId: input.officialCardId,
        payload: input.payload,
      };

      const response = input.id
        ? await api.admin['preview-cards'][':id'].$patch({
            param: { id: input.id },
            json: body,
          })
        : await api.admin['preview-cards'].$post({
            json: body,
          });

      if (!response.ok) {
        throw await readApiError(response, 'Failed to save preview card');
      }

      const result = (await response.json()) as { data: AdminPreviewCardRow };
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: previewCardsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['cardList'] });
    },
  });
}

export function useArchivePreviewCard() {
  const queryClient = useQueryClient();

  return useMutation<AdminPreviewCardRow, Error, string>({
    mutationFn: async id => {
      const response = await api.admin['preview-cards'][':id'].$delete({
        param: { id },
      });

      if (!response.ok) {
        throw await readApiError(response, 'Failed to archive preview card');
      }

      const result = (await response.json()) as { data: AdminPreviewCardRow };
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: previewCardsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['cardList'] });
    },
  });
}

export function useMigratePreviewCard() {
  const queryClient = useQueryClient();

  return useMutation<AdminPreviewCardRow, Error, { id: string; officialCardId: string }>({
    mutationFn: async input => {
      const response = await api.admin['preview-cards'][':id'].migrate.$post({
        param: { id: input.id },
        json: { officialCardId: input.officialCardId },
      });

      if (!response.ok) {
        throw await readApiError(response, 'Failed to migrate preview card');
      }

      const result = (await response.json()) as { data: AdminPreviewCardRow };
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: previewCardsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['cardList'] });
    },
  });
}

export function useUploadPreviewCardImage() {
  return useMutation<UploadPreviewCardImageResult, Error, UploadPreviewCardImageInput>({
    mutationFn: async input => {
      const formData = new FormData();
      formData.append('image', input.file);
      formData.append('side', input.side);
      formData.append('variantId', input.variantId ?? '');

      const response = await fetch(`/api/admin/preview-cards/${input.id}/image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw await readApiError(response, 'Failed to upload preview card image');
      }

      const result = (await response.json()) as { data: UploadPreviewCardImageResult };
      return result.data;
    },
  });
}

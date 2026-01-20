import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useLinkCreate = () => {
  return useMutation({
    mutationFn: async (json: {
      clientId: string;
      externalUserId: string;
      scopes: string[];
      integration: 'karabast';
      metadata?: Record<string, any>;
    }) => {
      const res = await api.integration['link-create'].$post({ json });
      if (!res.ok) {
        throw new Error('Failed to create link');
      }
      return res.json();
    },
  });
};

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export interface ParsePqTournamentsRequest {
  data: string;
}

export interface ParsePqTournamentsResponse {
  success: boolean;
  message: string;
  data: {
    parsedPqData: any;
  };
}

export const useParsePqTournaments = () => {
  return useMutation({
    mutationFn: async (data: ParsePqTournamentsRequest) => {
      const response = await api.tournament.bulk['pq-parse'].$post({
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(
          'message' in errorData ? errorData.message : 'Failed to parse PQ tournaments',
        );
      }

      return response.json() as Promise<ParsePqTournamentsResponse>;
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to parse PQ tournaments',
        description: error.message,
      });
    },
  });
};

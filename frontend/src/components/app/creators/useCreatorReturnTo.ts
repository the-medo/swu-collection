import { useLocation } from '@tanstack/react-router';
import { creatorReturnToSchema } from './creatorNavigationSearch.ts';

export function useCreatorReturnTo() {
  return useLocation({ select: location => creatorReturnToSchema.parse(location.href) });
}

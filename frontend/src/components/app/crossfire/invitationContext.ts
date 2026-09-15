import { createContext, useContext } from 'react';
import type { CrossfireInvitation } from '../../../../../shared/types/crossfire.ts';
export const InvitationContext = createContext<{
  invitations: CrossfireInvitation[];
  count: number;
}>({ invitations: [], count: 0 });
export const useCrossfireInvitations = () => useContext(InvitationContext);

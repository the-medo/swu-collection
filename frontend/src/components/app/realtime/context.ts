import { createContext, useContext } from 'react';
import type { AppRealtimeConnection } from '@/lib/appRealtime.ts';

export const AppRealtimeContext = createContext<AppRealtimeConnection | null>(null);
export const useAppRealtime = () => useContext(AppRealtimeContext);

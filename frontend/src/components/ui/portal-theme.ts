import { createContext, useContext } from 'react';

// CSS variables do not inherit through a DOM portal, but React context does.
// Pages can opt in to carrying their theme into nested dialogs and menus.
const PortalThemeContext = createContext<string | undefined>(undefined);

export const PortalThemeProvider = PortalThemeContext.Provider;
export const usePortalTheme = () => useContext(PortalThemeContext);

import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useCallback } from 'react';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const switchTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, [theme]);

  return (
    <Button variant="outline" size="icon" className="h-7 w-7" onClick={switchTheme}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

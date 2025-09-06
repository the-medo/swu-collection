import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import packageInfo from '../../../../../package.json';
import { cn } from '@/lib/utils.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider.tsx';
import { useCallback } from 'react';
import {
  DISCORD_LINK,
  GITHUB_LINK,
  PATREON_LINK,
} from '../../../../../../shared/consts/constants.ts';

const SocialLinks: React.FC = () => {
  const { open } = useSidebar();
  const { theme, setTheme } = useTheme();

  const switchTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, [theme, setTheme]);

  return (
    <div
      className={cn('flex w-full items-center justify-center gap-2', {
        'px-2 py-2 justify-between': open,
      })}
    >
      <div className={cn('flex items-center gap-2', { 'flex-col': !open })}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 [&_svg]:size-4 fill-foreground stroke-foreground"
          onClick={switchTheme}
          asChild
        >
          <div>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </div>
        </Button>
        {/*{session.data && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 [&_svg]:size-4 fill-foreground stroke-foreground"
              asChild
            >
              <Link to="/messages" aria-label="Messages">
                <MessageSquare />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 [&_svg]:size-4 fill-foreground stroke-foreground"
              asChild
            >
              <Link to="/notifications" aria-label="Notifications">
                <Bell />
              </Link>
            </Button>
          </>
        )}*/}
      </div>
      {open && (
        <div className={cn('flex items-center gap-1')}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 [&_svg]:size-4 fill-foreground stroke-foreground"
                  asChild
                >
                  <a
                    href={DISCORD_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Join our Discord"
                  >
                    <svg
                      role="img"
                      className="overflow-visible opacity-50"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>Discord</title>
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                    </svg>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Join our Discord</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 [&_svg]:size-4 fill-foreground stroke-foreground"
                  asChild
                >
                  <a
                    href={PATREON_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Support on Patreon"
                  >
                    <svg
                      role="img"
                      className="overflow-visible opacity-50"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 436 476"
                      fill="currentColor"
                    >
                      <title>Patreon logo</title>
                      <path d="M436 143c-.084-60.778-47.57-110.591-103.285-128.565C263.528-7.884 172.279-4.649 106.214 26.424 26.142 64.089.988 146.596.051 228.883c-.77 67.653 6.004 245.841 106.83 247.11 74.917.948 86.072-95.279 120.737-141.623 24.662-32.972 56.417-42.285 95.507-51.929C390.309 265.865 436.097 213.011 436 143Z"></path>
                    </svg>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Support on Patreon</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 [&_svg]:size-4 fill-foreground stroke-foreground"
                  asChild
                >
                  <a
                    href={GITHUB_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View on GitHub"
                  >
                    <svg
                      role="img"
                      className="overflow-visible opacity-50"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>GitHub</title>
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                  </a>
                </Button>
              </TooltipTrigger>
              <span className="text-xs text-muted-foreground ml-auto">v{packageInfo.version}</span>
              <TooltipContent>
                <p>View on GitHub</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

export default SocialLinks;

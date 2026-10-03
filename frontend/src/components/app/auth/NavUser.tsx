import { UserRoundCog, LogOut, Moon, Settings, ShieldCheck, Sun } from 'lucide-react';
import { MessageBadge } from '@/components/app/messages/MessageBadge.tsx';
import { NotificationBell } from '@/components/app/notifications/NotificationBell.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { signOut, useSession } from '@/lib/auth-client.ts';
import { Link } from '@tanstack/react-router';
import { useTheme } from '@/components/theme-provider.tsx';
import { useCallback } from 'react';
import { useRole } from '@/hooks/useRole.ts';

export function NavUser() {
  const session = useSession();
  const { theme, setTheme } = useTheme();
  const hasRole = useRole();

  const user = session.data?.user;

  const userName = user?.name ?? 'User';
  const userAvatar = user?.image ?? '';

  const { isMobile, setOpenMobile } = useSidebar();
  const isAdmin = hasRole('admin');

  const switchTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, [theme, setTheme]);

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center justify-between gap-1 group-data-[collapsible=icon]:flex-col">
        {user && (
          <SidebarMenuButton
            asChild
            size="lg"
            className="h-9 w-9 shrink-0 justify-center p-0"
            title="My profile"
          >
            <Link
              to="/users/$userId"
              params={{ userId: user.id }}
              aria-label="My profile"
              onClick={event => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0)
                  setOpenMobile(false);
              }}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={userAvatar} alt="" />
                <AvatarFallback className="rounded-lg">{userName[0]}</AvatarFallback>
              </Avatar>
            </Link>
          </SidebarMenuButton>
        )}
        <div className="ml-auto flex items-center gap-1 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:flex-col">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                aria-label="Account menu"
                title="Account menu"
                className="h-9 w-9 shrink-0 justify-center p-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <UserRoundCog className="size-4" aria-hidden="true" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <Link to={'/settings'}>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                </Link>
                {isAdmin && (
                  <Link to={'/admin'}>
                    <DropdownMenuItem className="cursor-pointer">
                      <ShieldCheck />
                      Admin dashboard
                    </DropdownMenuItem>
                  </Link>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onSelect={switchTheme}>
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span>Toggle theme</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={async () => {
                  await signOut();
                }}
              >
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <NotificationBell />
          <MessageBadge />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

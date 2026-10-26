import { useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { ChartPie, House, LayoutGrid, LogIn, Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { DeckIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';
import { workspaceTheme } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { useUser } from '@/hooks/useUser.ts';
import { cn } from '@/lib/utils.ts';
import Logo from '@/assets/logo-dark-theme.svg';

export function MobileHeader() {
  const user = useUser();

  return (
    <header
      className={cn(
        workspaceTheme,
        'mobile-navigation flex shrink-0 items-center justify-between gap-3 border-b border-border bg-sidebar px-4 pt-[env(safe-area-inset-top)] lg:hidden',
      )}
    >
      <Link
        to="/"
        aria-label="SWUBASE home"
        className="flex min-h-14 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-[#17352e]">
          <img src={Logo} alt="" className="size-6 brightness-0 invert" />
        </span>
        <span className="text-lg tracking-[-0.06em]">
          SWU<strong className="font-bold">BASE</strong>
        </span>
      </Link>
      {user ? (
        <Button asChild variant="ghost" size="icon" className="size-11 rounded-xl">
          <Link to="/users/$userId" params={{ userId: user.id }} aria-label="My profile">
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={user.image ?? undefined} alt="" />
              <AvatarFallback className="rounded-lg">{user.name?.[0] ?? 'U'}</AvatarFallback>
            </Avatar>
          </Link>
        </Button>
      ) : (
        <SignIn
          trigger={
            <Button variant="ghost" className="h-11 gap-2 rounded-xl px-3">
              <LogIn className="size-4" aria-hidden="true" />
              Sign in
            </Button>
          }
        />
      )}
    </header>
  );
}

export function MobileBottomTabs() {
  const user = useUser();
  const { openMobile, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();

  // Also close after browser back/forward and navigation from account menus.
  useEffect(() => {
    setOpenMobile(false);
  }, [location.href, isMobile, setOpenMobile]);

  const tabs = [
    { label: 'Home', to: '/', prefix: '/', icon: House },
    { label: 'Meta', to: '/meta', prefix: '/meta', icon: ChartPie },
    {
      label: 'Decks',
      to: user ? '/decks/your' : '/decks/public',
      prefix: '/decks',
      icon: DeckIcon,
    },
    { label: 'Cards', to: '/cards/search', prefix: '/cards', icon: LayoutGrid },
  ] as const;
  const isActive = (prefix: string) =>
    location.pathname === prefix || (prefix !== '/' && location.pathname.startsWith(`${prefix}/`));
  const moreActive = openMobile || !tabs.some(tab => isActive(tab.prefix));
  const tabClassName =
    'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none';
  const activeClassName = 'bg-[var(--workspace-soft)] text-[color:var(--workspace-accent)]';

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        workspaceTheme,
        'mobile-navigation z-30 grid shrink-0 grid-cols-5 gap-1 border-t border-border bg-sidebar px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden',
      )}
    >
      {tabs.map(tab => (
        <Link
          key={tab.label}
          to={tab.to}
          activeOptions={{ exact: true }}
          aria-current={isActive(tab.prefix) && !openMobile ? 'page' : undefined}
          className={cn(tabClassName, isActive(tab.prefix) && !openMobile && activeClassName)}
        >
          <tab.icon className="size-5" aria-hidden="true" />
          <span>{tab.label}</span>
        </Link>
      ))}
      <button
        type="button"
        aria-label="More"
        aria-haspopup="dialog"
        aria-expanded={openMobile}
        aria-controls={openMobile ? 'mobile-more-menu' : undefined}
        className={cn(tabClassName, moreActive && activeClassName)}
        onClick={() => setOpenMobile(!openMobile)}
      >
        <Menu className="size-5" aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}

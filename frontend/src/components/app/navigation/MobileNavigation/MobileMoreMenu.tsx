import { Link } from '@tanstack/react-router';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import SocialLinks from '@/components/app/navigation/LeftSidebar/SocialLinks.tsx';
import { SidebarYourTournaments } from '@/components/app/navigation/LeftSidebar/SidebarYourTournaments.tsx';
import type { SidebarNavigationEntry } from '@/components/app/navigation/LeftSidebar/SidebarNavigationItem.tsx';
import SidebarComparer from '@/components/app/comparer/SidebarComparer/SidebarComparer.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { workspaceTheme } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';

export type NavigationGroup = { id: string; title: string; items: SidebarNavigationEntry[] };

const menuLinkClassName =
  'flex min-h-13 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-3 text-[15px] font-medium transition-colors hover:bg-[var(--workspace-soft)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&.active]:bg-[var(--workspace-soft)]';

export function MobileMoreMenu({ groups }: { groups: NavigationGroup[] }) {
  const { setOpenMobile } = useSidebar();
  const user = useUser();
  const close = () => setOpenMobile(false);

  return (
    <div
      className={cn(
        workspaceTheme,
        'mobile-more-menu flex min-h-0 flex-1 flex-col bg-sidebar text-sidebar-foreground',
      )}
    >
      <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30" />
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-2">
        <h2 className="m-0! border-0! p-0! text-lg! font-semibold! tracking-tight">
          More on SWUBASE
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-xl"
          aria-label="Close menu"
          onClick={close}
        >
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>
      <nav
        aria-label="More navigation"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 [&_[data-sidebar=menu-button]]:min-h-11"
      >
        {groups.map(group => {
          // Primary destinations remain in the tab bar; retain personal deck actions here.
          const items = group.items
            .filter(
              item =>
                item.url !== '/meta' && (user || item.url !== '/decks/public'),
            )
            .map(item => ({
              ...item,
              // The map lives below Tournaments; favorites are omitted from More.
              action:
                item.url === '/tournaments' || item.url === '/decks/public'
                  ? undefined
                  : item.action,
              secondaryAction:
                item.url === '/collections/your' || item.url === '/wantlists/your'
                  ? undefined
                  : item.secondaryAction,
              items: item.items?.filter(link => link.url !== '/decks/favorite'),
            }));
          if (!items.length) return null;
          return (
            <section
              key={group.id}
              aria-labelledby={`mobile-group-${group.id}`}
              className="border-b border-border/60 pb-4"
            >
              <h3
                id={`mobile-group-${group.id}`}
                className="mb-1! text-[11px]! font-semibold! uppercase tracking-widest! text-muted-foreground"
              >
                {group.title}
              </h3>
              <ul className="m-0 list-none space-y-0.5 p-0">
                {items.map(item => (
                  <li key={item.url} className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1">
                      <Link
                        to={item.url}
                        onClick={close}
                        aria-label={item.label ?? item.title}
                        className={menuLinkClassName}
                      >
                        <item.icon
                          aria-hidden="true"
                          className="size-5 shrink-0 text-[color:var(--workspace-accent)]"
                        />
                        <span className="min-w-0 flex-1 break-words">{item.title}</span>
                        {item.badge && (
                          <span className="flex flex-wrap items-center gap-1">{item.badge}</span>
                        )}
                        {!item.action && !item.secondaryAction && (
                          <ChevronRight
                            aria-hidden="true"
                            className="size-4 shrink-0 text-muted-foreground/60"
                          />
                        )}
                      </Link>
                      {(item.action || item.secondaryAction) && (
                        <div className="flex shrink-0 items-center [&_[data-sidebar=menu-action]]:static [&_[data-sidebar=menu-action]]:size-11 [&_[data-sidebar=menu-action]]:rounded-full [&_[data-sidebar=menu-action]]:text-muted-foreground [&_[data-sidebar=menu-action]]:after:hidden">
                          {item.action}
                          {item.secondaryAction}
                        </div>
                      )}
                    </div>
                    {!!item.items?.length && (
                      <ul
                        aria-label={`${item.label ?? item.title} shortcuts`}
                        className="mt-0 mb-2 ml-[18px] list-none space-y-0.5 border-l border-border p-0 pl-3"
                      >
                        {item.items.map(link => (
                          <li key={link.url} className="flex min-w-0 items-center gap-1">
                            <Link
                              to={link.url}
                              onClick={close}
                              className={cn(menuLinkClassName, 'min-h-11 py-2')}
                            >
                              <span className="min-w-0 flex-1 break-words">{link.title}</span>
                              <ChevronRight
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground/60"
                              />
                            </Link>
                            {link.statisticsUrl && (
                              <Link
                                to={link.statisticsUrl}
                                onClick={close}
                                aria-label={`${link.title} statistics`}
                                className={cn(menuLinkClassName, 'min-h-11 flex-none py-2 text-sm')}
                              >
                                Statistics
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {user && <SidebarYourTournaments />}
        <ul className="m-0 list-none p-0">
          <li>
            <SidebarComparer
              setOpenMobile={setOpenMobile}
              buttonClassName={cn(
                menuLinkClassName,
                'h-auto [&>svg]:size-5 [&>svg]:text-[color:var(--workspace-accent)]',
              )}
            />
          </li>
        </ul>
        <SocialLinks />
      </nav>
      <div className="shrink-0 border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&_[data-sidebar=menu-button]]:size-11 [&>button]:h-11 [&>button]:w-full">
        <SignIn isLeftSidebar forceTextButton />
      </div>
    </div>
  );
}

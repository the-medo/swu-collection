import { sidebarStyles } from '@/components/app/navigation/LeftSidebar/sidebarStyles';
import { useState, type ComponentType, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { ChartSpline, ChevronRight } from 'lucide-react';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { cn } from '@/lib/utils.ts';

export interface SidebarNavigationLink {
  title: string;
  url: string;
  statisticsUrl?: string;
}

export interface SidebarNavigationEntry extends SidebarNavigationLink {
  icon: ComponentType<{ className?: string }>;
  label?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  badge?: ReactNode;
  className?: string;
  items?: SidebarNavigationLink[];
  submenu?: 'always' | 'collapsed-only';
}

export function SidebarNavigationItem({ item }: { item: SidebarNavigationEntry }) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const expanded = isMobile || state === 'expanded';
  const pathname = useLocation({ select: location => location.pathname });
  const [disclosure, setDisclosure] = useState<{ pathname: string; open: boolean }>();
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const matches = (url: string) => pathname === url || pathname.startsWith(`${url}/`);
  const childActive = item.items?.some(link => matches(link.url)) ?? false;
  const active = matches(item.url) || childActive;
  const hasChildren = Boolean(item.items?.length);
  const canCollapse = hasChildren && !item.submenu;
  const actionCount =
    Number(Boolean(item.action)) + Number(Boolean(item.secondaryAction)) + Number(canCollapse);
  const open =
    item.submenu === 'always' ||
    (disclosure?.pathname === pathname ? disclosure.open : childActive);
  const label = item.label ?? item.title;
  const navigate = () => {
    setFlyoutOpen(false);
    setOpenMobile(false);
  };

  const sublinks = (includeParent = false) => {
    const links: SidebarNavigationLink[] = includeParent
      ? [{ title: label, url: item.url }, ...(item.items ?? [])]
      : (item.items ?? []);
    return (
      <>
        <SidebarMenuSub>
          {links.map(link => (
            <SidebarMenuSubItem key={link.url} className="relative">
              <SidebarMenuSubButton asChild className={cn(link.statisticsUrl && 'pr-8')}>
                <Link to={link.url} title={link.title} onClick={navigate}>
                  <span>{link.title}</span>
                </Link>
              </SidebarMenuSubButton>
              {link.statisticsUrl && (
                <SidebarMenuAction asChild title={`${link.title} statistics`}>
                  <Link to={link.statisticsUrl} onClick={navigate}>
                    <ChartSpline />
                    <span className="sr-only">{link.title} statistics</span>
                  </Link>
                </SidebarMenuAction>
              )}
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </>
    );
  };

  if (!expanded && hasChildren) {
    return (
      <SidebarMenuItem>
        <Popover open={flyoutOpen} onOpenChange={setFlyoutOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              tooltip={label}
              aria-label={`${label} menu`}
              isActive={active}
              className={item.className}
            >
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={10}
            aria-label={`${label} shortcuts`}
            onClick={event => {
              if (event.target instanceof Element && event.target.closest('a[href]')) {
                setFlyoutOpen(false);
              }
            }}
            className={cn(
              'w-64 max-h-(--radix-popover-content-available-height) overflow-y-auto p-2',
              sidebarStyles.navigationFlyout,
            )}
          >
            {sublinks(true)}
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible asChild open={open} onOpenChange={next => setDisclosure({ pathname, open: next })}>
      <SidebarMenuItem>
        <div className="sidebar-navigation-row relative">
          <SidebarMenuButton
            asChild
            tooltip={label}
            isActive={active}
            className={cn(item.className, actionCount > 1 && sidebarStyles.twoActions)}
          >
            <Link to={item.url} aria-label={label} onClick={navigate}>
              <item.icon />
              <span className="flex-1">{item.title}</span>
              {expanded && item.badge}
            </Link>
          </SidebarMenuButton>
          {expanded && actionCount > 0 && (
            <div className={sidebarStyles.itemActions}>
              {item.secondaryAction}
              {item.action}
              {canCollapse && (
                <CollapsibleTrigger asChild>
                  <SidebarMenuAction aria-label={`${label} shortcuts`} title={`${label} shortcuts`}>
                    <ChevronRight className={cn('transition-transform', open && 'rotate-90')} />
                  </SidebarMenuAction>
                </CollapsibleTrigger>
              )}
            </div>
          )}
        </div>
        {hasChildren && item.submenu !== 'collapsed-only' && (
          <CollapsibleContent>{sublinks()}</CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}

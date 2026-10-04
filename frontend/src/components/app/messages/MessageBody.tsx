import { useMemo, useState, type MouseEvent } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';
import { splitMessageLinks } from './messageLinks.ts';

const linkClassName =
  'rounded-sm underline decoration-foreground/50 underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function MessageBody({ body }: { body: string }) {
  const parts = useMemo(() => splitMessageLinks(body), [body]);
  const router = useRouter();
  return parts.map((part, index) => {
    if (!part.href) return part.text;
    const url = new URL(part.href);
    if (url.origin === window.location.origin) {
      const { foundRoute, routeParams } = router.getMatchedRoutes(url.pathname, undefined);
      if (!foundRoute || routeParams['**'] || url.pathname.startsWith('//')) {
        return (
          <a key={index} href={url.href} className={linkClassName}>
            {part.text}
          </a>
        );
      }
      return (
        <Link
          key={index}
          to={url.pathname}
          search={router.options.parseSearch(url.search)}
          hash={url.hash.slice(1)}
          className={linkClassName}
        >
          {part.text}
        </Link>
      );
    }
    return <ExternalMessageLink key={index} href={url.href} text={part.text} />;
  });
}

function ExternalMessageLink({ href, text }: { href: string; text: string }) {
  const [open, setOpen] = useState(false);
  const confirm = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setOpen(true);
  };
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <a
          href={href}
          className={linkClassName}
          onClick={confirm}
          onAuxClick={event => {
            if (event.button === 1) confirm(event);
          }}
        >
          {text}
        </a>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(32rem,calc(100vw-2rem))] overflow-y-auto whitespace-normal">
        <AlertDialogHeader>
          <AlertDialogTitle>Open external link?</AlertDialogTitle>
          <AlertDialogDescription>
            This link takes you to another website: {new URL(href).hostname}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="rounded-md bg-muted p-3 text-sm [overflow-wrap:anywhere]">
          <bdi>{href}</bdi>
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <a href={href} target="_blank" rel="noopener noreferrer">
              Continue
            </a>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

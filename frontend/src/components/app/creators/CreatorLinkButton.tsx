import {
  ArrowUpRight,
  BadgeCheck,
  Facebook,
  Globe,
  GraduationCap,
  Heart,
  Instagram,
  Mail,
  Podcast,
  Twitch,
  Youtube,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import type { CreatorProfileInput } from '../../../../../shared/creators/contracts.ts';

// Discord reuses the app's existing brand artwork. Other brand paths are from
// Simple Icons (CC0): https://github.com/simple-icons/simple-icons
const brandPaths = {
  discord:
    'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
  bluesky:
    'M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026',
  tiktok:
    'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  patreon:
    'M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z',
  linktree:
    'm13.73635 5.85251 4.00467-4.11665 2.3248 2.3808-4.20064 4.00466h5.9085v3.30473h-5.9365l4.22865 4.10766-2.3248 2.3338L12.0005 12.099l-5.74052 5.76852-2.3248-2.3248 4.22864-4.10766h-5.9375V8.12132h5.9085L3.93417 4.11666l2.3248-2.3808 4.00468 4.11665V0h3.4727zm-3.4727 10.30614h3.4727V24h-3.4727z',
  x: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
};

function BrandIcon({ name }: { name: keyof typeof brandPaths }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={brandPaths[name]} />
    </svg>
  );
}

const platforms = [
  {
    hosts: ['youtube.com', 'youtu.be'],
    icon: <Youtube aria-hidden="true" />,
    className: 'bg-[#d9232b] text-white hover:bg-[#bd1820] hover:text-white',
  },
  {
    hosts: ['discord.gg', 'discord.com', 'discordapp.com'],
    icon: <BrandIcon name="discord" />,
    className: 'bg-[#5865f2] text-white hover:bg-[#4752c4] hover:text-white',
  },
  {
    hosts: ['twitch.tv'],
    icon: <Twitch aria-hidden="true" />,
    className: 'bg-[#7c3aed] text-white hover:bg-[#6d28d9] hover:text-white',
  },
  {
    hosts: ['patreon.com'],
    icon: <BrandIcon name="patreon" />,
    className: 'bg-[#ff8a73] text-[#41150d] hover:bg-[#ff9e8b] hover:text-[#41150d]',
  },
  {
    hosts: ['instagram.com'],
    icon: <Instagram aria-hidden="true" />,
    className:
      'bg-gradient-to-br from-[#833ab4] via-[#b52b79] to-[#b74b22] text-white hover:from-[#722e9e] hover:via-[#9e2268] hover:to-[#a13f1b] hover:text-white',
  },
  {
    hosts: ['bsky.app', 'bsky.social'],
    icon: <BrandIcon name="bluesky" />,
    className: 'bg-[#0866d9] text-white hover:bg-[#0757ba] hover:text-white',
  },
  {
    hosts: ['x.com', 'twitter.com'],
    icon: <BrandIcon name="x" />,
    className: 'border-white/20 bg-[#202124] text-white hover:bg-[#34363a] hover:text-white',
  },
  {
    hosts: ['tiktok.com'],
    icon: <BrandIcon name="tiktok" />,
    className:
      'border-[#25f4ee]/40 bg-[#172426] text-white hover:border-[#25f4ee]/70 hover:bg-[#25383b] hover:text-white',
  },
  {
    hosts: ['facebook.com', 'fb.com'],
    icon: <Facebook aria-hidden="true" />,
    className: 'bg-[#0866d9] text-white hover:bg-[#0757ba] hover:text-white',
  },
  {
    hosts: ['linktr.ee'],
    icon: <BrandIcon name="linktree" />,
    className: 'bg-[#b7ea52] text-[#20350c] hover:bg-[#c7f473] hover:text-[#20350c]',
  },
  {
    hosts: ['metafy.gg', 'mfy.gg'],
    icon: <GraduationCap aria-hidden="true" />,
    className: 'bg-[#ffce70] text-[#40290a] hover:bg-[#ffdb96] hover:text-[#40290a]',
  },
  {
    hosts: ['rss.com', 'podcasts.apple.com', 'open.spotify.com'],
    icon: <Podcast aria-hidden="true" />,
    className: 'bg-[#6d28d9] text-white hover:bg-[#5b21b6] hover:text-white',
  },
];

export function CreatorLinkButton({
  label,
  url,
  kind,
  verified = false,
}: CreatorProfileInput['links'][number] & { verified?: boolean }) {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    // Invalid legacy URLs can still use the generic presentation.
  }
  // Match the destination, never the editable label or a lookalike hostname.
  const platform = platforms.find(({ hosts }) =>
    hosts.some(host => hostname === host || hostname.endsWith(`.${host}`)),
  );
  const FallbackIcon = kind === 'support' ? Heart : kind === 'contact' ? Mail : Globe;
  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        'h-auto min-h-10 max-w-full justify-start gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold shadow-sm transition-[background-color,border-color,box-shadow] hover:shadow-md',
        platform && 'border-transparent',
        platform?.className,
      )}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={verified ? 'Channel control verified through YouTube' : undefined}
      >
        {platform?.icon ?? <FallbackIcon aria-hidden="true" />}
        <span className="min-w-0 whitespace-normal break-words text-left leading-snug">
          {label}
        </span>
        {verified ? (
          <>
            <BadgeCheck className="size-3.5!" aria-hidden="true" />
            <span className="sr-only">Channel control verified through YouTube.</span>
          </>
        ) : (
          <ArrowUpRight className="size-3! opacity-70" aria-hidden="true" />
        )}
        <span className="sr-only">Opens in a new tab.</span>
      </a>
    </Button>
  );
}

import { type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

export function ExternalButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button size="xs" variant="outline" asChild>
      <a href={href} target="_blank" rel="noreferrer">
        {children}
        <ExternalLink className="h-3 w-3" />
      </a>
    </Button>
  );
}

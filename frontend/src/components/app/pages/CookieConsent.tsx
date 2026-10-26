import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';

const CookieConsent: React.FC<{ mobileInline?: boolean }> = ({ mobileInline = false }) => {
  const [isVisible, setIsVisible] = useState(() => !localStorage.getItem('cookie-consent'));

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className={cn(
        'bottom-0 left-0 right-0 border-t border-border bg-secondary p-3 shadow-lg lg:p-4',
        mobileInline ? 'relative shrink-0 lg:fixed lg:z-50' : 'fixed z-50',
      )}
    >
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-2 lg:gap-4">
        <div className="text-sm grow">
          <p>
            We use cookies to keep you signed in and to understand how SWUBase is used via anonymous
            analytics (Amplitude, no session recording). By clicking "Accept", you agree to this as
            described in our
            <Button variant="link" className="px-1 py-0 h-auto text-primary" asChild>
              <Link to="/privacy">Privacy Policy</Link>
            </Button>
            .
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 lg:min-h-0"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4 mr-1" /> Dismiss
          </Button>
          <Button
            variant="default"
            size="sm"
            className="min-h-11 lg:min-h-0"
            onClick={acceptCookies}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

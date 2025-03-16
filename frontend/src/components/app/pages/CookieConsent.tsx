import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Link } from '@tanstack/react-router';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consentGiven = localStorage.getItem('cookie-consent');
    if (!consentGiven) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-secondary p-4 z-50 shadow-lg">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm flex-grow">
          <p>
            We use cookies to keep you logged in and that's about it. By clicking "Accept" you agree
            to our use of cookies as described in our
            <Button variant="link" className="px-1 py-0 h-auto text-primary" asChild>
              <Link to="/privacy">Privacy Policy</Link>
            </Button>
            .
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setIsVisible(false)}>
            <X className="h-4 w-4 mr-1" /> Dismiss
          </Button>
          <Button variant="default" size="sm" onClick={acceptCookies}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

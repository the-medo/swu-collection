import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { Separator } from '@/components/ui/separator.tsx';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background text-muted-foreground w-full mt-auto py-2 text-sm border-t">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <div>
              <p className="text-center md:text-left">© {currentYear} swubase.com</p>
            </div>
            <div className="flex gap-4 items-center">
              <Link to="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
              <Link to="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
            </div>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground text-center md:text-left">
            <p className="m-0 p-0">
              SWUBASE is an unofficial fan site. The information presented on this site about Star
              Wars: Unlimited (including images and symbols), is copyright Fantasy Flight Publishing
              Inc and Lucasfilm Ltd. SWUBASE is not endorsed or produced by FFG or LFL in any way.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

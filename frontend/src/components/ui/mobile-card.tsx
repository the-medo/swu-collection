import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';

interface MobileCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

const MobileCard: React.FC<MobileCardProps> = ({ children, title, description, className }) => {
  const { isMobile } = useSidebar();

  // If not mobile, just render the children without the card wrapper
  if (!isMobile) {
    return <>{children}</>;
  }

  // On mobile, wrap the content in a Card component
  return (
    <Card className={cn(className, 'w-full')}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent
        className={cn({
          'p-2': !title && !description,
        })}
      >
        {children}
      </CardContent>
    </Card>
  );
};

export default MobileCard;

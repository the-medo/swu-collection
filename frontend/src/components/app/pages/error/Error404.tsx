import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { AlertCircle } from 'lucide-react';

interface Error404Props {
  title: string;
  description?: string;
}

const Error404: React.FC<Error404Props> = ({ title, description }) => {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="pl-8">{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
    </Alert>
  );
};

export default Error404;

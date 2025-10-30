import * as React from 'react';
import { AnyFieldMeta } from '@tanstack/react-form';

interface FormFieldErrorProps {
  meta: AnyFieldMeta;
}

const FormFieldError: React.FC<FormFieldErrorProps> = ({ meta }) => {
  return meta.errors ? (
    <p className="text-sm font-medium text-destructive">{meta.errors[0]?.toString()}</p>
  ) : null;
};

export default FormFieldError;

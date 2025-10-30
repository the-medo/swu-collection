import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateMeta } from '@/api/meta/useCreateMeta';
import { useUpdateMeta } from '@/api/meta/useUpdateMeta';
import { MetaData } from '@/api/meta/useGetMetas';
import { formatData } from '../../../../../types/Format';
import { SwuSet } from '../../../../../types/enums';
import { toast } from '@/hooks/use-toast.ts';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { z } from 'zod';

// Create validators for the form fields
const nameValidator = z.string().min(1).max(255);
const setValidator = z.string().min(1).max(255);
const formatValidator = z.number().min(1);
const dateValidator = z.string().min(1).max(12);
const seasonValidator = z.number().min(0);

interface MetaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: MetaData['meta'];
  onSuccess?: () => void;
}

export function MetaForm({ open, onOpenChange, initialData, onSuccess }: MetaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMeta = useCreateMeta();
  const updateMeta = useUpdateMeta();

  const isEditing = !!initialData;
  const title = isEditing ? 'Edit Meta' : 'Create Meta';
  const description = isEditing
    ? 'Edit the meta information below'
    : 'Add a new meta to the system';
  const actionText = isEditing ? 'Save changes' : 'Create';

  // Initialize the form with default values or initial data
  const form = useForm({
    defaultValues: {
      name: initialData?.name || '',
      set: initialData?.set || ('sor' as keyof typeof SwuSet),
      format: initialData?.format || (undefined as unknown as number),
      date: initialData?.date || new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
      season: initialData?.season || 0,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        if (isEditing && initialData) {
          await updateMeta.mutateAsync({
            id: initialData.id,
            data: value,
          });
          toast({
            title: 'Meta updated',
            description: `Meta "${value.name}" has been updated.`,
          });
        } else {
          await createMeta.mutateAsync(value);
          toast({
            title: 'Meta created',
            description: `Meta "${value.name}" has been created.`,
          });
        }
        onSuccess?.();
        form.reset();
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to ${isEditing ? 'update' : 'create'} meta. Please try again.`,
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          {/* Name field */}
          <form.Field
            name="name"
            validators={{
              onChange: nameValidator,
              onBlur: nameValidator,
            }}
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  placeholder="Meta name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  required
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          />

          {/* Set field */}
          <form.Field
            name="set"
            validators={{
              onChange: setValidator,
              onBlur: setValidator,
            }}
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Set</Label>
                <Select onValueChange={field.handleChange} value={field.state.value}>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select a set" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SwuSet).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          />

          {/* Format field */}
          <form.Field
            name="format"
            validators={{
              onChange: formatValidator,
              onBlur: formatValidator,
            }}
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Format</Label>
                <Select
                  onValueChange={value => field.handleChange(parseInt(value, 10))}
                  value={field.state.value?.toString()}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select a format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formatData.map(format => (
                      <SelectItem key={format.id} value={format.id.toString()}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          />

          {/* Date field */}
          <form.Field
            name="date"
            validators={{
              onChange: dateValidator,
              onBlur: dateValidator,
            }}
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Date</Label>
                <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  required
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          />

          {/* Season field */}
          <form.Field
            name="season"
            validators={{
              onChange: seasonValidator,
              onBlur: seasonValidator,
            }}
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Season</Label>
                <Input
                  id={field.name}
                  type="number"
                  min={0}
                  placeholder="Season number"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(parseInt(e.target.value) || 0)}
                  required
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : actionText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

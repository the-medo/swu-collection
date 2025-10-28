import * as React from 'react';
import { useState } from 'react';
import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Collection } from '../../../../../types/Collection.ts';
import { CollectionType } from '../../../../../types/enums.ts';
import { useDuplicateCollection } from '@/api/collections/useDuplicateCollection.ts';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx';
import { useNavigate } from '@tanstack/react-router';
import { BookOpenCheck, ClipboardList, Copy, ScrollText } from 'lucide-react';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/components/ui/input.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';

interface DuplicateCollectionDialogProps extends Pick<DialogProps, 'trigger'> {
  collection: Collection;
}

type CollectionTypeOption = {
  value: CollectionType;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const DuplicateCollectionDialog: React.FC<DuplicateCollectionDialogProps> = ({
  trigger,
  collection,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CollectionType>(collection.collectionType);
  const mutation = useDuplicateCollection();
  const navigate = useNavigate();

  const collectionTypeOptions: CollectionTypeOption[] = [
    {
      value: CollectionType.COLLECTION,
      label: 'Collection',
      description: 'Cards you own or want to track',
      icon: <BookOpenCheck className="h-4 w-4" />,
    },
    {
      value: CollectionType.WANTLIST,
      label: 'Wantlist',
      description: 'Cards you want to acquire',
      icon: <ScrollText className="h-4 w-4" />,
    },
    {
      value: CollectionType.OTHER,
      label: 'Other List',
      description: 'Special purpose lists, proxies, etc.',
      icon: <ClipboardList className="h-4 w-4" />,
    },
  ];

  const form = useForm({
    defaultValues: {
      title: `Copy of ${collection.title}`,
      public: collection.public,
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await mutation.mutateAsync({
          collectionId: collection.id,
          collectionType: selectedType,
          title: value.title,
          public: value.public,
        });

        setOpen(false);

        // Navigate to the new collection
        setTimeout(() => {
          navigate({ to: '/collections/$collectionId', params: { collectionId: result.data.id } });
        }, 500);
      } catch (error) {
        console.error(error);
      }
    },
  });

  return (
    <Dialog
      trigger={trigger}
      header="Create a duplicate"
      open={open}
      onOpenChange={setOpen}
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => form.handleSubmit()}
            disabled={mutation.isPending || form.state.isSubmitting}
            className="flex items-center gap-1"
          >
            <Copy className="h-4 w-4" />
            {mutation.isPending || form.state.isSubmitting ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-4 p-2"
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div>
          <p className="text-sm text-muted-foreground">
            You are duplicating <span className="font-medium">{collection.title}</span>
          </p>
        </div>

        <div className="space-y-4">
          <form.Field
            name="title"
            children={field => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Title</Label>
                <Input
                  type="text"
                  id={field.name}
                  placeholder="Title"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />

          <Label>Select the type for the new collection:</Label>

          <RadioGroup
            value={selectedType.toString()}
            onValueChange={value => setSelectedType(Number(value) as CollectionType)}
            className="space-y-2"
          >
            {collectionTypeOptions.map(option => (
              <div
                key={option.value}
                className={`flex items-center space-x-2 rounded-md border p-4 
                  ${selectedType === option.value ? 'border-primary bg-primary/5' : 'border-muted'}`}
              >
                <RadioGroupItem value={option.value.toString()} id={`type-${option.value}`} />
                <Label
                  htmlFor={`type-${option.value}`}
                  className="flex flex-1 cursor-pointer items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <form.Field
            name="public"
            children={field => (
              <div className="flex gap-2 items-center mt-4">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onCheckedChange={e => field.handleChange(!!e)}
                />
                <Label htmlFor={field.name}>Public</Label>
              </div>
            )}
          />
        </div>
      </form>
    </Dialog>
  );
};

export default DuplicateCollectionDialog;

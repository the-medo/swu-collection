import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useForm } from '@tanstack/react-form';
import { api } from '@/lib/api.ts';
import { SwuSet } from '../../../../../types/enums.ts';

export const Route = createFileRoute('/collections/$collectionId/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const form = useForm<{
    set: string;
    setNumber: number;
    owned: number;
  }>({
    defaultValues: {
      set: '',
      setNumber: 0,
      owned: 1,
    },
    onSubmit: async ({ value }) => {
      // Do something with form data
      console.log(value);
      const res = await api.collection.$post({
        json: {
          ...value,
          set: value.set as SwuSet,
        },
      });

      if (!res.ok) {
        throw new Error('Server error');
      }
      navigate({ to: '/collections/your' });
    },
  });

  return (
    <div>
      <form
        className="max-w-3xl m-auto"
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="set"
          children={field => (
            <>
              <Label htmlFor={field.name}>Set</Label>
              <Input
                type="text"
                id={field.name}
                placeholder="Set"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
              />
            </>
          )}
        />
        <form.Field
          name="setNumber"
          children={field => (
            <>
              <Label htmlFor={field.name}>Card number</Label>
              <Input
                name={field.name}
                type="number"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(parseInt(e.target.value))}
              />
            </>
          )}
        />
        <form.Field
          name="owned"
          children={field => (
            <>
              <Label htmlFor={field.name}>Owned</Label>
              <Input
                type="number"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(parseInt(e.target.value))}
              />
            </>
          )}
        />
        <Button type="submit" className="mt-4">
          Create collection card
        </Button>
      </form>
    </div>
  );
}

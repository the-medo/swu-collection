import * as React from 'react';
import { useForm } from '@tanstack/react-form';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import { formatDate } from '@/lib/locale';
import { Tournament } from '../../../../../types/Tournament.ts';
import {
  ZTournamentCreateRequest,
  ZTournamentUpdateRequest,
} from '../../../../../types/ZTournament.ts';
import { SwuSet } from '../../../../../types/enums.ts';
import { setArray } from '../../../../../lib/swu-resources/set-info.ts';
import TournamentTypeSelect from '@/components/app/tournaments/components/TournamentTypeSelect.tsx';

interface TournamentFormProps {
  initialData?: Tournament;
  onSubmit: ((data: ZTournamentCreateRequest) => void) | ((data: ZTournamentUpdateRequest) => void);
  isSubmitting: boolean;
}

const continents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

const TournamentForm: React.FC<TournamentFormProps> = ({ initialData, onSubmit, isSubmitting }) => {
  const form = useForm<ZTournamentCreateRequest>({
    defaultValues: {
      type: (initialData?.type as any) || 'local_tournament',
      season: initialData?.season || 1,
      set: initialData?.set || SwuSet.JTL,
      metaShakeup: initialData?.metaShakeup || '',
      location: initialData?.location || '',
      continent: initialData?.continent || 'Europe',
      name: initialData?.name || '',
      attendance: initialData?.attendance || 0,
      meleeId: initialData?.meleeId || '',
      format: initialData?.format || 1,
      days: initialData?.days || 1,
      date: initialData?.date ? formatDate(initialData.date) : formatDate(new Date()),
    },
    onSubmit: async ({ value }) => {
      onSubmit(value);
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {/* Name */}
      <form.Field
        name="name"
        children={field => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Tournament Name *</Label>
            <Input
              id={field.name}
              placeholder="Tournament Name"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={e => field.handleChange(e.target.value)}
              required
            />
          </div>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type */}
        <form.Field
          name="type"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Tournament Type *</Label>
              <TournamentTypeSelect
                value={field.state.value}
                onChange={value => field.handleChange(value || 'local')}
                showFullName={true}
                emptyOption={false}
              />
            </div>
          )}
        />

        {/* Format */}
        <form.Field
          name="format"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Format *</Label>
              <FormatSelect
                value={field.state.value}
                onChange={value => field.handleChange(value || 1)}
                allowEmpty={false}
              />
            </div>
          )}
        />

        {/* Set */}
        <form.Field
          name="set"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Set *</Label>
              <Select value={field.state.value} onValueChange={value => field.handleChange(value)}>
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Select set" />
                </SelectTrigger>
                <SelectContent>
                  {setArray.map(set => (
                    <SelectItem key={set.code} value={set.code}>
                      {set.name} ({set.code.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {/* Season */}
        <form.Field
          name="season"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Season *</Label>
              <Input
                id={field.name}
                type="number"
                placeholder="Season number"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(parseInt(e.target.value) || 1)}
                min={1}
                required
              />
            </div>
          )}
        />

        {/* Date */}
        <form.Field
          name="date"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Tournament Date *</Label>
              <Input
                id={field.name}
                type="date"
                value={
                  typeof field.state.value === 'string'
                    ? field.state.value
                    : formatDate(field.state.value)
                }
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
                required
              />
            </div>
          )}
        />

        {/* Days */}
        <form.Field
          name="days"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Duration (days) *</Label>
              <Input
                id={field.name}
                type="number"
                placeholder="Number of days"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(parseInt(e.target.value) || 1)}
                min={1}
                max={7}
                required
              />
            </div>
          )}
        />

        {/* Location */}
        <form.Field
          name="location"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Location *</Label>
              <Input
                id={field.name}
                placeholder="City, Country"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
                required
              />
            </div>
          )}
        />

        {/* Continent */}
        <form.Field
          name="continent"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Continent *</Label>
              <Select value={field.state.value} onValueChange={value => field.handleChange(value)}>
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Select continent" />
                </SelectTrigger>
                <SelectContent>
                  {continents.map(continent => (
                    <SelectItem key={continent} value={continent}>
                      {continent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {/* Attendance */}
        <form.Field
          name="attendance"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Attendance *</Label>
              <Input
                id={field.name}
                type="number"
                placeholder="Number of participants"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(parseInt(e.target.value) || 0)}
                min={0}
                required
              />
            </div>
          )}
        />

        {/* Meta Shakeup */}
        <form.Field
          name="metaShakeup"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Meta Shakeup</Label>
              <Input
                id={field.name}
                placeholder="Meta shakeup (optional)"
                value={field.state.value || ''}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
              />
            </div>
          )}
        />

        {/* Melee ID */}
        <form.Field
          name="meleeId"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Melee.gg ID</Label>
              <Input
                id={field.name}
                placeholder="Melee.gg tournament ID (optional)"
                value={field.state.value || ''}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
              />
            </div>
          )}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Processing...' : initialData ? 'Update Tournament' : 'Create Tournament'}
      </Button>
    </form>
  );
};

export default TournamentForm;

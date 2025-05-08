import * as React from 'react';
import { useForm } from '@tanstack/react-form';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import { TournamentStringDate } from '../../../../../types/Tournament.ts';
import {
  ZTournamentCreateRequest,
  ZTournamentUpdateRequest,
} from '../../../../../types/ZTournament.ts';
import { SwuSet } from '../../../../../types/enums.ts';
import TournamentTypeSelect from '@/components/app/tournaments/components/TournamentTypeSelect.tsx';
import ContinentSelect from '@/components/app/tournaments/components/ContinentSelect.tsx';
import { DatePicker } from '@/components/ui/date-picker.tsx';
import { format } from 'date-fns';
import CountrySelector from '@/components/app/global/CountrySelector.tsx';
import MetaSelector from '@/components/app/global/MetaSelector.tsx';
import { CountryCode } from '../../../../../server/db/lists.ts';

interface TournamentFormProps {
  initialData?: TournamentStringDate;
  onSubmit: ((data: ZTournamentCreateRequest) => void) | ((data: ZTournamentUpdateRequest) => void);
  isSubmitting: boolean;
}

const TournamentForm: React.FC<TournamentFormProps> = ({ initialData, onSubmit, isSubmitting }) => {
  const form = useForm<ZTournamentCreateRequest>({
    defaultValues: {
      type: (initialData?.type as any) || 'local_tournament',
      location: initialData?.location || '',
      continent: initialData?.continent || 'Europe',
      name: initialData?.name || '',
      attendance: initialData?.attendance || 0,
      meleeId: initialData?.meleeId || '',
      format: initialData?.format || 1,
      days: initialData?.days || 1,
      dayTwoPlayerCount: initialData?.dayTwoPlayerCount || 0,
      date: initialData?.date ?? format(new Date(), 'yyyy-MM-dd'),
      meta: initialData?.meta || undefined,
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
                onChange={value => field.handleChange(value)}
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
                onChange={value => field.handleChange(value)}
                allowEmpty={false}
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
              <DatePicker
                date={field.state.value}
                onDateChange={date => field.handleChange(date)}
                placeholder="Select tournament date"
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
                onChange={e => field.handleChange(parseInt(e.target.value))}
                min={1}
                max={3}
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
              <CountrySelector
                value={field.state.value as CountryCode}
                onChangeCountry={(e: CountryCode | null) => field.handleChange(e || 'US')}
                allowClear={false}
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
              <ContinentSelect
                value={field.state.value}
                onChange={value => field.handleChange(value || '')}
                emptyOption={false}
              />
              {field.state.value}
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
                onChange={e => field.handleChange(parseInt(e.target.value) ?? undefined)}
                min={0}
                required
              />
            </div>
          )}
        />

        {/* Days */}
        <form.Field
          name="dayTwoPlayerCount"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Day 2 player count</Label>
              <Input
                id={field.name}
                type="number"
                placeholder="Day 2 player count"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(parseInt(e.target.value))}
                min={0}
                required
              />
            </div>
          )}
        />

        {/* Meta */}
        <form.Field
          name="meta"
          children={field => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Meta</Label>
              <MetaSelector
                value={field.state.value || null}
                emptyOption={true}
                onChange={value => field.handleChange(value)}
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

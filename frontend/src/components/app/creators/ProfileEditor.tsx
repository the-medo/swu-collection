import { ImageField } from './ImageField.tsx';
import { LanguagePicker } from './CreatorLanguages.tsx';
import { lazy, Suspense, useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useForm, useStore } from '@tanstack/react-form';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Button } from '@/components/ui/button.tsx';
import { hubApi, useSaveCreatorProfile } from '@/api/creators';
import { emptyPostDocument } from '../../../../../shared/posts/content.ts';
import {
  creatorProfileSchema,
  type CreatorProfile,
  type CreatorProfileInput,
} from '../../../../../shared/creators/contracts.ts';
import { Field, selectClass, Status, TagPicker } from './CreatorControls.tsx';
import { creatorHeading, creatorPanel, creatorSubheading } from './creatorStyles.ts';
const PostEditor = lazy(() => import('../rich-text-editor/blocknote/BlocknoteEditor.tsx'));
export default function ProfileEditor({
  profile,
  onSaved,
  onCancel,
}: {
  profile?: CreatorProfile;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<Error>();
  const allowLeave = useRef(false);
  const revision = useRef(profile?.revision);
  const [generation, setGeneration] = useState(0);
  const mutation = useSaveCreatorProfile();
  const [initial, setInitial] = useState<CreatorProfileInput>(
    () =>
      profile ?? {
        slug: '',
        name: '',
        tagline: '',
        bio: emptyPostDocument(),
        avatarUrl: '',
        bannerUrl: '',
        languages: ['en'],
        specialties: [],
        links: [],
        introduction: '',
      },
  );
  const { bio: initialBio, ...initialFields } = initial;
  const [bio, setBio] = useState(initialBio);
  const form = useForm({
    defaultValues: { profile: initialFields },
    onSubmit: async ({ value }) => {
      const validation = creatorProfileSchema.safeParse({ ...value.profile, bio });
      if (!validation.success) {
        setError(
          new Error(
            validation.error.issues
              .map(issue => `${issue.path.join('.')}: ${issue.message}`)
              .join(' · '),
          ),
        );
        return;
      }
      setError(undefined);
      try {
        const result = await mutation.mutateAsync({
          profile: validation.data,
          id: profile?.id,
          revision: revision.current,
        });
        allowLeave.current = true;
        onSaved(result.id);
      } catch {
        /* Mutation error shown below. */
      }
    },
  });
  const fieldsDirty = useStore(form.store, state => state.isDirty);
  const dirty = fieldsDirty || JSON.stringify(bio) !== JSON.stringify(initialBio);
  useBlocker({
    shouldBlockFn: () =>
      !allowLeave.current && dirty && !window.confirm('Leave with unsaved profile changes?'),
    enableBeforeUnload: dirty,
  });
  const recover = async (keepLocal: boolean) => {
    if (
      !profile ||
      !window.confirm(
        keepLocal
          ? 'Replace the current saved profile with your changes?'
          : 'Discard your unsaved profile changes and load the saved version?',
      )
    )
      return;
    try {
      const latest = await hubApi.profile(profile.slug);
      revision.current = latest.revision;
      mutation.reset();
      setError(undefined);
      if (keepLocal) await form.handleSubmit();
      else {
        setInitial(latest);
        const { bio: savedBio, ...fields } = latest;
        setBio(savedBio);
        form.reset({ profile: fields });
        setGeneration(value => value + 1);
      }
    } catch (failure) {
      setError(failure as Error);
    }
  };
  return (
    <form
      className={`${creatorPanel} mx-auto grid max-w-5xl gap-6`}
      onSubmit={e => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <h2 className={creatorHeading}>
        {profile ? 'Edit creator profile' : 'Make a home for your creations'}
      </h2>
      <form.Field name="profile">
        {field => {
          const value = field.state.value,
            update = (patch: Partial<Omit<CreatorProfileInput, 'bio'>>) =>
              field.handleChange({ ...value, ...patch });
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Creator or brand name">
                  <Input
                    value={value.name}
                    maxLength={100}
                    onChange={e => update({ name: e.target.value })}
                    required
                  />
                </Field>
                <Field
                  label="Profile address"
                  hint="Letters, numbers and hyphens. Your profile address stays fixed after creation."
                >
                  <Input
                    disabled={!!profile}
                    value={value.slug}
                    onChange={e => update({ slug: e.target.value })}
                    placeholder="your-creator-name"
                    required
                  />
                </Field>
              </div>
              <Field label="Tagline">
                <Input
                  value={value.tagline}
                  maxLength={240}
                  onChange={e => update({ tagline: e.target.value })}
                  placeholder="What do you help SWU players discover?"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageField
                  label="Avatar"
                  value={value.avatarUrl}
                  onChange={avatarUrl => update({ avatarUrl })}
                />
                <ImageField
                  label="Banner"
                  value={value.bannerUrl}
                  onChange={bannerUrl => update({ bannerUrl })}
                />
              </div>
              <LanguagePicker
                multiple
                selected={value.languages}
                onChange={languages => update({ languages })}
              />
              <Field
                label="Start here"
                hint="Introduce yourself and suggest where a new visitor should begin."
              >
                <Textarea
                  value={value.introduction}
                  maxLength={2000}
                  onChange={e => update({ introduction: e.target.value })}
                />
              </Field>
              <div className="grid gap-3 border-t border-border pt-5">
                <h3 className={creatorSubheading}>About you</h3>
                <Suspense fallback={<p>Loading editor…</p>}>
                  <PostEditor
                    key={generation}
                    type="simple"
                    initialContent={initial.bio}
                    onChange={setBio}
                    disabled={mutation.isPending}
                  />
                </Suspense>
              </div>
              <div className="grid gap-3 border-t border-border pt-5 [&>button]:justify-self-start">
                <h3 className={creatorSubheading}>Social, website and support links</h3>
                {value.links.map((link, index) => (
                  <div
                    key={index}
                    className="grid items-end gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-2 xl:grid-cols-[1fr_2fr_140px_auto]"
                  >
                    <Field label="Label">
                      <Input
                        value={link.label}
                        onChange={e =>
                          update({
                            links: value.links.map((l, i) =>
                              i === index ? { ...l, label: e.target.value } : l,
                            ),
                          })
                        }
                        placeholder="YouTube, Patreon, Discord…"
                      />
                    </Field>
                    <Field label="HTTPS URL">
                      <Input
                        type="url"
                        value={link.url}
                        onChange={e =>
                          update({
                            links: value.links.map((l, i) =>
                              i === index ? { ...l, url: e.target.value } : l,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="Link type">
                      <select
                        className={selectClass}
                        value={link.kind}
                        onChange={e =>
                          update({
                            links: value.links.map((l, i) =>
                              i === index ? { ...l, kind: e.target.value as typeof link.kind } : l,
                            ),
                          })
                        }
                      >
                        {['social', 'website', 'support', 'contact'].map(kind => (
                          <option key={kind}>{kind}</option>
                        ))}
                      </select>
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => update({ links: value.links.filter((_, i) => i !== index) })}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={value.links.length >= 20}
                  onClick={() =>
                    update({ links: [...value.links, { label: '', url: '', kind: 'social' }] })
                  }
                >
                  Add a link
                </Button>
              </div>
              <div className="grid gap-3 border-t border-border pt-5">
                <h3 className={creatorSubheading}>Your specialties</h3>
                <TagPicker
                  selected={value.specialties}
                  onChange={specialties => update({ specialties })}
                  dimensions={['purpose', 'format', 'audience', 'topic', 'environment']}
                  compact
                />
              </div>
            </>
          );
        }}
      </form.Field>
      <Status error={error ?? mutation.error} />
      {(mutation.error as (Error & { status?: number }) | null)?.status === 409 && profile && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void recover(false)}>
            Load saved profile
          </Button>
          <Button type="button" variant="outline" onClick={() => void recover(true)}>
            Save my profile instead
          </Button>
        </div>
      )}
      <div className="flex gap-3 border-t border-border pt-5">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save profile'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!dirty || window.confirm('Discard profile changes?')) {
              allowLeave.current = true;
              onCancel();
            }
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

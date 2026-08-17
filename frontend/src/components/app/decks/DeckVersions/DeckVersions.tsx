import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { GitBranch, Loader2, Save } from 'lucide-react';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useGetDeckVersions } from '@/api/decks/useGetDeckVersions.ts';
import { useSaveDeckVersion } from '@/api/decks/useSaveDeckVersion.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import DeckVersionDiff from './DeckVersionDiff.tsx';
import type { DeckVersionSummary } from '../../../../../../types/Deck.ts';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
import CopyLinkButton from '@/components/app/decks/DeckContents/DeckActionsMenu/components/CopyLinkButton.tsx';

const ChangeCounts = ({ version }: { version: DeckVersionSummary }) => {
  const parts = [
    version.addedCards ? `+${version.addedCards}` : '',
    version.removedCards ? `−${version.removedCards}` : '',
    version.changedCards ? `~${version.changedCards}` : '',
  ].filter(Boolean);
  return <span>{parts.length ? parts.join(' · ') : 'No card changes'}</span>;
};

const DeckVersions = ({ deckId }: { deckId: string }) => {
  const { data: deckData } = useGetDeck(deckId);
  const canonicalDeckId = deckData?.reference?.deckId ?? deckData?.deck.id ?? deckId;
  const supportsVersions = Boolean(deckData && !deckData.deck.cardPoolId);
  const { data, isLoading } = useGetDeckVersions(supportsVersions ? canonicalDeckId : undefined);
  const saveVersion = useSaveDeckVersion(canonicalDeckId);
  const [changeNote, setChangeNote] = useState('');
  const [displayChanges, setDisplayChanges] = useState(false);

  if (!supportsVersions) return null;
  const versions = data?.data ?? [];
  const isParent = deckData?.reference?.kind === 'parent' || !deckData?.reference;
  const canSave = Boolean(deckData?.permissions?.canSaveVersion && isParent);

  const handleSave = async () => {
    await saveVersion.mutateAsync(changeNote);
    setChangeNote('');
  };

  return (
    <Card className="w-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="size-4" /> Versions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {deckData?.reference?.kind === 'sealed-version' && (
          <div className="rounded-md bg-muted p-2 text-xs">
            Viewing saved version {deckData.reference.versionNumber}. This decklist is read-only.
          </div>
        )}
        {deckData?.reference?.kind === 'open-version' && (
          <div className="rounded-md bg-muted p-2 text-xs">
            Viewing current changes v{deckData.reference.versionNumber}. This link remains mutable
            until the version is saved.
          </div>
        )}

        {canSave && (
          <div className="space-y-2">
            <Input
              value={changeNote}
              onChange={event => setChangeNote(event.target.value)}
              placeholder="Optional version note"
              maxLength={255}
            />
            <Button
              className="w-full"
              size="sm"
              onClick={() => void handleSave()}
              disabled={
                saveVersion.isPending || (versions.length > 0 && versions[0]?.hasChanges === false)
              }
            >
              {saveVersion.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {versions.length ? 'Save current version' : 'Create first version'}
            </Button>
          </div>
        )}

        {isLoading && <div className="text-sm text-muted-foreground">Loading versions…</div>}
        {!isLoading && versions.length === 0 && (
          <div className="text-sm text-muted-foreground">No saved versions yet.</div>
        )}
        {versions.some(version => version.versionNumber > 1) && (
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0 text-xs"
            onClick={() => setDisplayChanges(current => !current)}
          >
            {displayChanges ? 'Hide changes' : 'Display changes'}
          </Button>
        )}
        <div className="space-y-2">
          {versions.map(version => (
            <div key={version.id} className="rounded-md border p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <Link
                      to="/decks/$deckId"
                      params={{ deckId: version.id }}
                      className="font-medium hover:underline"
                    >
                      {version.state === 'open'
                        ? `Current changes v${version.versionNumber}`
                        : `Saved v${version.versionNumber}`}
                    </Link>
                    {version.changeNote && (
                      <InfoTooltip tooltip={version.changeNote} className="p-0" />
                    )}
                  </div>
                  {version.versionNumber > 1 && (
                    <div className="text-xs text-muted-foreground">
                      <ChangeCounts version={version} />
                      {version.sealedAt && ` · ${new Date(version.sealedAt).toLocaleDateString()}`}
                    </div>
                  )}
                </div>
                <CopyLinkButton
                  deckId={version.id}
                  isPublic={Boolean(deckData?.deck.public)}
                  variant="ghost"
                  size="xs"
                  label="Link"
                />
              </div>
              {displayChanges && version.versionNumber > 1 && version.hasChanges && (
                <DeckVersionDiff deckId={canonicalDeckId} versionId={version.id} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeckVersions;

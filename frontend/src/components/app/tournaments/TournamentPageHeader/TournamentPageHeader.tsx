import React, { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { formatData, formatDataById } from '../../../../../../types/Format.ts';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector.tsx';
import { useGetMetas } from '@/api/meta';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import NewTournamentDialog from '@/components/app/dialogs/NewTournamentDialog.tsx';
import { Route } from '@/routes/__root.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import { SlidersHorizontal } from 'lucide-react';

interface TournamentPageHeaderProps {
  title?: string;
  className?: string;
}

const TournamentPageHeader: React.FC<TournamentPageHeaderProps> = ({
  title = 'Tournaments',
  className,
}) => {
  const { isMobile } = useSidebar();
  const hasPermission = usePermissions();
  const navigate = useNavigate({ from: Route.fullPath });
  const { formatId = 1, metaId } = useSearch({ strict: false });
  const { data: metasData, isLoading: isLoadingMetas } = useGetMetas();
  const canCreate = hasPermission('tournament', 'create');

  const setFormat = useCallback(
    (v: number | null) => {
      navigate({
        search: prev => ({ ...prev, formatId: v ?? formatData[0].id }),
      });
    },
    [navigate],
  );

  const setMeta = useCallback(
    (v: number) => {
      navigate({
        search: prev => ({ ...prev, metaId: v }),
      });
    },
    [navigate],
  );

  const currentMeta = useMemo(() => {
    return metasData?.data
      .filter(m => m.format.id === formatId)
      .sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1))[0];
  }, [metasData, formatId]);

  const selectedMeta = useMemo(() => {
    if (!metasData) return undefined;

    if (metaId) {
      const metaInFormat = metasData?.data.find(
        m => m.format.id === formatId && m.meta.id === metaId,
      );
      if (metaInFormat) {
        return metaInFormat;
      }
    }

    return metasData.data.length > 0 ? currentMeta : undefined;
  }, [metasData, formatId, metaId, currentMeta]);

  const selectedMetaId = selectedMeta ? selectedMeta.meta.id : undefined;

  useEffect(() => {
    if (!selectedMetaId || metaId === selectedMetaId) return;
    navigate({
      search: prev => ({ ...prev, metaId: selectedMetaId }),
    });
  }, [metaId, selectedMetaId]);

  if (isLoadingMetas) {
    return (
      <div className="flex flex-row gap-4 items-center justify-between mb-4">
        {!isMobile && <h3>{title}</h3>}
        <span className="text-gray-600">Format</span>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  // Mobile view with accordion
  if (isMobile) {
    return (
      <Accordion
        type="single"
        collapsible
        defaultValue={undefined}
        className={`w-full mb-4 ${className}`}
      >
        <AccordionItem value="header" className="border rounded-md">
          <div className="flex flex-col items-start">
            <AccordionTrigger className="px-4 pt-3 pb-1 hover:no-underline" right>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="font-medium">Format & Meta</span>
              </div>
            </AccordionTrigger>
            {selectedMeta && formatId && (
              <span className="text-xs text-muted-foreground p-2">
                {formatDataById[formatId]?.name} - {selectedMeta.meta.name}
              </span>
            )}
          </div>
          <AccordionContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <span className="text-gray-600">Format</span>
                <FormatSelect
                  value={formatId}
                  onChange={setFormat}
                  allowEmpty={false}
                  showInfoTooltip={false}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <span className="text-gray-600">Meta</span>
                {selectedMetaId && (
                  <MetaSelector
                    formatId={formatId}
                    value={selectedMetaId}
                    onChange={setMeta}
                    emptyOption={false}
                  />
                )}
              </div>

              {canCreate && (
                <div className="pt-2">
                  <NewTournamentDialog
                    trigger={<Button className="w-full">New Tournament</Button>}
                  />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  // Desktop view
  return (
    <div className={`flex flex-row flex-wrap gap-4 items-center justify-between mb-4 ${className}`}>
      <h3 className="mb-0">{title}</h3>
      <div className="flex flex-row flex-1 gap-2 items-center min-w-[200px]">
        <span className="text-gray-600">Format</span>
        <FormatSelect
          value={formatId}
          onChange={setFormat}
          allowEmpty={false}
          showInfoTooltip={false}
          className="w-full"
        />
      </div>

      <div className="flex flex-1 min-w-[350px]">
        {selectedMetaId && (
          <MetaSelector
            formatId={formatId}
            value={selectedMetaId}
            onChange={setMeta}
            emptyOption={false}
          />
        )}
      </div>

      {canCreate && <NewTournamentDialog trigger={<Button>New Tournament</Button>} />}
    </div>
  );
};

export default TournamentPageHeader;

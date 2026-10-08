import { Link } from '@tanstack/react-router';
import { useMemo, useRef, useState } from 'react';
import { useUserHeader } from '@/api/user-header/useUserHeader';
import type { UserHeader } from '../../../../../../types/UserHeader.ts';
import { Orbit, GalleryHorizontal, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { usePublicBattlefield } from '@/api/battlefield/useBattlefield';
import { BattlefieldCanvas } from '@/components/app/battlefield/BattlefieldCanvas';
import { useBattlefieldLightMotion } from '@/components/app/battlefield/useBattlefieldLightMotion';
import { defaultBattlefieldScene } from '../../../../../../shared/types/battlefield.ts';

export function ProfileHeader({ userId, canEdit = false }: { userId?: string; canEdit?: boolean }) {
  const query = useUserHeader(userId);
  if (userId && query.isPending)
    return (
      <div className="aspect-[4/1] w-full shrink-0 animate-pulse bg-muted" aria-hidden="true" />
    );
  return (
    <div className="relative w-full shrink-0 overflow-hidden">
      <ProfileHeaderPreview header={query.data} userId={userId} />
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-md border border-white/20 bg-black/40 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-white">
              <Orbit className="size-3.5" aria-hidden="true" />
              Battlefield
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link
                to="/battlefield"
                search={{
                  battlefieldPreset: undefined,
                  battlefieldSlot: undefined,
                  battlefieldPresetMode: undefined,
                }}
              >
                <Pencil className="size-4" />
                Battlefield editor
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/battlefield-showcase">
                <GalleryHorizontal className="size-4" />
                Battlefield showcase
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function ProfileHeaderPreview({
  header,
  userId,
}: {
  header?: Pick<UserHeader, 'image' | 'width' | 'height'>;
  userId?: string;
}) {
  return header?.image ? (
    <ImageHeader
      key={header.image}
      src={header.image}
      width={header.width}
      height={header.height}
      userId={userId}
    />
  ) : userId ? (
    <SavedProfileBattlefield userId={userId} />
  ) : (
    <DefaultProfileHeader />
  );
}

function ImageHeader({
  src,
  width,
  height,
  userId,
}: {
  src: string;
  width: number | null;
  height: number | null;
  userId?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return userId ? <SavedProfileBattlefield userId={userId} /> : <DefaultProfileHeader />;
  return (
    <div
      className="relative min-h-24 max-h-[400px] shrink-0 overflow-hidden bg-muted"
      style={{ aspectRatio: `${width ?? 1600} / ${height ?? 400}` }}
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function SavedProfileBattlefield({ userId }: { userId: string }) {
  const { data } = usePublicBattlefield(userId);
  const fallback = useMemo(
    () => defaultBattlefieldScene('00000000-0000-4000-8000-000000000000'),
    [],
  );
  const scene = data?.scene ?? fallback;
  const viewport = useRef<SVGSVGElement>(null);
  const light = useBattlefieldLightMotion(scene.light, viewport);
  return (
    <div className="relative aspect-[4/1] w-full shrink-0 overflow-hidden">
      <BattlefieldCanvas
        ref={viewport}
        scene={scene}
        light={light}
        className="absolute inset-0 size-full"
        decorative
      />
    </div>
  );
}

function DefaultProfileHeader() {
  return (
    <div
      className="relative h-40 shrink-0 overflow-hidden @[761px]/main-body:h-56 bg-[radial-gradient(ellipse_at_75%_130%,#5d7981_0%,#263f50_24%,#122431_48%,#0a141e_78%)]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(1px_1px_at_12%_21%,white_98%,transparent),radial-gradient(1px_1px_at_24%_64%,white_98%,transparent),radial-gradient(1px_1px_at_38%_16%,white_98%,transparent),radial-gradient(1px_1px_at_51%_46%,white_98%,transparent),radial-gradient(2px_2px_at_63%_19%,#f8e4a1_98%,transparent),radial-gradient(1px_1px_at_89%_36%,white_98%,transparent)] bg-size-[460px_190px] opacity-65" />
      <div className="absolute top-[50px] right-0 size-70 -rotate-30 rounded-full bg-[radial-gradient(circle_at_42%_-22%,#8ca2a3_0%,#314955_37%,#101d29_61%,#07101a_76%)] shadow-[0_-2px_3px_#afc4c5aa,0_-13px_40px_#829a9829] @[761px]/main-body:top-[66px] @[761px]/main-body:right-[7%] @[761px]/main-body:size-90" />
      <div className="absolute top-13 -right-20 h-[210px] w-120 -rotate-22 rounded-[50%] border border-[#e8d59b44] @[761px]/main-body:-right-[25px] @[761px]/main-body:w-[650px]" />
    </div>
  );
}

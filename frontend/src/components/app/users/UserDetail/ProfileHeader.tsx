import { useState } from 'react';
import { useUserHeader } from '@/api/user-header/useUserHeader.ts';
import type { UserHeader } from '../../../../../../types/UserHeader.ts';

export function ProfileHeader({ userId }: { userId?: string }) {
  const query = useUserHeader(userId);
  if (userId && query.isPending)
    return (
      <div
        className="h-40 shrink-0 animate-pulse bg-muted @[761px]/main-body:h-56"
        aria-hidden="true"
      />
    );
  return <ProfileHeaderPreview header={query.data} />;
}

export function ProfileHeaderPreview({
  header,
}: {
  header?: Pick<UserHeader, 'image' | 'width' | 'height'>;
}) {
  return header?.image ? (
    <ImageHeader
      key={header.image}
      src={header.image}
      width={header.width}
      height={header.height}
    />
  ) : (
    <BattlefieldHeader />
  );
}

function ImageHeader({
  src,
  width,
  height,
}: {
  src: string;
  width: number | null;
  height: number | null;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <BattlefieldHeader />;
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

function BattlefieldHeader() {
  return (
    <div
      className="relative h-40 shrink-0 overflow-hidden bg-[radial-gradient(ellipse_at_75%_130%,#5d7981_0%,#263f50_24%,#122431_48%,#0a141e_78%)] @[761px]/main-body:h-56"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(1px_1px_at_12%_21%,white_98%,transparent),radial-gradient(1px_1px_at_24%_64%,white_98%,transparent),radial-gradient(1px_1px_at_38%_16%,white_98%,transparent),radial-gradient(1px_1px_at_51%_46%,white_98%,transparent),radial-gradient(2px_2px_at_63%_19%,#f8e4a1_98%,transparent),radial-gradient(1px_1px_at_89%_36%,white_98%,transparent)] bg-size-[460px_190px] opacity-65" />
      <div className="absolute top-[50px] right-0 size-70 -rotate-30 rounded-full bg-[radial-gradient(circle_at_42%_-22%,#8ca2a3_0%,#314955_37%,#101d29_61%,#07101a_76%)] shadow-[0_-2px_3px_#afc4c5aa,0_-13px_40px_#829a9829] @[761px]/main-body:top-[66px] @[761px]/main-body:right-[7%] @[761px]/main-body:size-90" />
      <div className="absolute top-13 -right-20 h-[210px] w-120 -rotate-22 rounded-[50%] border border-[#e8d59b44] @[761px]/main-body:-right-[25px] @[761px]/main-body:w-[650px]" />
    </div>
  );
}

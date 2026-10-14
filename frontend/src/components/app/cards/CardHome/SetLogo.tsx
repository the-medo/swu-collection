import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import type { SwuSet } from '../../../../../../types/enums.ts';

export default function SetLogo({ set, className }: { set: SwuSet; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('flex items-center justify-center', className)}>
      {failed ? (
        <span className="text-center text-xl font-bold uppercase tracking-wider drop-shadow-lg">
          {setInfo[set].name}
        </span>
      ) : (
        <img
          src={`https://images.swubase.com/logos/${set}.png`}
          alt={`${setInfo[set].name} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
        />
      )}
    </div>
  );
}

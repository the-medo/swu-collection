import { useState } from 'react';
import SetIcon from '@/components/app/global/icons/SetIcon.tsx';

export function CreatorSetLogo({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="w-20 shrink-0" aria-hidden="true" onErrorCapture={() => setFailed(true)}>
      {failed ? (
        <span className="flex min-h-8 items-center justify-center rounded-lg bg-black p-2 text-xs font-semibold text-white">
          {code.toUpperCase()}
        </span>
      ) : (
        <SetIcon set={code} size="full" />
      )}
    </span>
  );
}

import { useEffect, useState } from 'react';
import { addDays, format, startOfDay } from 'date-fns';

// Keep date windows aligned to the viewer's local day, including waking a sleeping tab.
export function useToday() {
  const [today, setToday] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      setToday(format(now, 'yyyy-MM-dd'));
      timer = setTimeout(update, startOfDay(addDays(now, 1)).getTime() - now.getTime() + 100);
    };
    update();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, []);
  return today;
}

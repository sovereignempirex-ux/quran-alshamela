"use client";

import { useCallback, useEffect, useState } from "react";

// للقراءة من الـ localStorage بأمان (يمنع أخطاء SSR / mismatch)
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  // القراءة الأولية بعد التركيب (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* تجاهل الأخطاء */
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const newVal = next instanceof Function ? next(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(newVal));
        } catch {
          /* تجاهل */
        }
        return newVal;
      });
    },
    [key]
  );

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setValue(initial);
    } catch {
      /* تجاهل */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, setValue: update, remove, loaded };
}

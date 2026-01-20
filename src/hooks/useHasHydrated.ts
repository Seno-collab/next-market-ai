"use client";

import { useEffect, useState } from "react";

export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setHydrated(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return hydrated;
}

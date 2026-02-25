"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { fetchJson } from "@/lib/api/client";
import type { ApiStatus } from "@/types/api";

type UseApiStatusOptions = {
  endpoint?: string;
  auto?: boolean;
};

type ApiStatusState = {
  data: ApiStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DEFAULT_ENDPOINT = "/api/status";

export function useApiStatus({
  endpoint = DEFAULT_ENDPOINT,
  auto = true,
}: UseApiStatusOptions = {}): ApiStatusState {
  const { t } = useLocale();
  const [data, setData] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await fetchJson<ApiStatus>(endpoint, {
        cache: "no-store",
      });
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.generic");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, t]);

  useEffect(() => {
    if (auto) {
      void refresh();
    }
  }, [auto, refresh]);

  return { data, loading, error, refresh };
}

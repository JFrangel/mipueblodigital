"use client";

import { useEffect, useState } from "react";
import { memberHeaders } from "@/data/remote-reports";
import { onReportUpdate } from "@/data/report-updates";

export function useCommunityStatistics(signed: boolean) {
  const [data, setData] = useState<{
    summary: ReturnType<typeof import("@/domain/logic").summarize>;
    states: Record<string, number>;
    categories: Record<string, number>;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => onReportUpdate(() => setRevision((n) => n + 1)), []);
  useEffect(() => {
    if (!signed) return;
    const controller = new AbortController();
    async function load() {
      try {
        const { headers } = await memberHeaders();
        const response = await fetch("/api/community/statistics/", {
          headers,
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (
          !Number.isSafeInteger(data.summary?.total) ||
          !data.states ||
          !data.categories
        )
          throw new Error();
        if (controller.signal.aborted) return;
        setData(data);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision, signed]);
  return {
    data,
    failed,
    retry: () => {
      setFailed(false);
      setRevision((n) => n + 1);
    },
  };
}

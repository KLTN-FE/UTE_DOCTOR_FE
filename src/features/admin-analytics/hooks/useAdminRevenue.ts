"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";

import { adminAnalyticsService } from "@/features/admin-analytics/services/adminAnalyticsService";
import {
  getErrorMessage,
  MetricState,
  VolumeRange,
} from "@/features/admin-analytics/hooks/useAdminAnalytics";
import { RevenueResult } from "@/features/admin-analytics/types/admin-analytics.types";

const INITIAL = <T>(): MetricState<T> => ({ data: null, loading: true, error: null });

export const useAdminRevenue = () => {
  const [limit, setLimit] = useState(5);
  const [billingRange, setBillingRange] = useState<VolumeRange>({});
  const [revenue, setRevenue] = useState<MetricState<RevenueResult>>(INITIAL);

  const load = useCallback(() => {
    let active = true;

    const run = async <T>(
      fetcher: () => Promise<T>,
      setState: Dispatch<SetStateAction<MetricState<T>>>
    ) => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const data = await fetcher();
        if (active) setState({ data, loading: false, error: null });
      } catch (error) {
        if (active) setState({ data: null, loading: false, error: getErrorMessage(error) });
      }
    };

    const query = { from: billingRange.from, to: billingRange.to, limit };
    void run(() => adminAnalyticsService.getRevenue(query), setRevenue);

    return () => {
      active = false;
    };
  }, [billingRange.from, billingRange.to, limit]);

  useEffect(() => load(), [load]);

  const hasBillingOverride = billingRange.from !== undefined || billingRange.to !== undefined;

  return {
    limit,
    setLimit,
    billingRange,
    setBillingRange,
    hasBillingOverride,
    revenue,
    reload: load,
  };
};

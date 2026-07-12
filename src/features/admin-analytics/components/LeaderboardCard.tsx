import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsWindow } from "@/features/admin-analytics/types/admin-analytics.types";
import { WindowBadge } from "@/features/admin-analytics/components/WindowBadge";

interface LeaderboardCardProps {
  title: string;
  icon?: ReactNode;
  /** The metric's own `window` (or `undefined` while loading — badge hidden then). */
  window?: AnalyticsWindow;
  windowPresetLabel?: string;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyLabel?: string;
  onRetry?: () => void;
  footnote?: ReactNode;
  children: ReactNode;
}

export function LeaderboardCard({
  title,
  icon,
  window,
  windowPresetLabel,
  loading,
  error,
  isEmpty,
  emptyLabel = "Chưa có dữ liệu",
  onRetry,
  footnote,
  children,
}: LeaderboardCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden border-slate-200/80 shadow-sm dark:border-slate-800">
      <CardHeader className="border-b bg-gradient-to-r from-sky-50 via-white to-emerald-50 py-4 dark:from-sky-950/30 dark:via-gray-950 dark:to-emerald-950/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          </div>
          {window !== undefined ? (
            <WindowBadge window={window} presetLabel={windowPresetLabel} />
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-5">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-2">
                <p>{error}</p>
                {onRetry ? (
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Thử lại
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          children
        )}

        {!loading && !error && footnote ? (
          <p className="mt-auto pt-1 text-xs text-muted-foreground">{footnote}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

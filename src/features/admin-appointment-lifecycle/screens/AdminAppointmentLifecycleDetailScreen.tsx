"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  CircleDashed,
  Database,
  FileWarning,
  Flag,
  GitBranch,
  Loader2,
  MapPinned,
  RefreshCcw,
  ShieldAlert,
  Split,
  UserX,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAdminAppointmentLifecycle } from "@/features/admin-appointment-lifecycle/hooks/useAdminAppointmentLifecycle";
import { useLifecycleNodeDetail } from "@/features/admin-appointment-lifecycle/hooks/useLifecycleNodeDetail";
import { useMarkAppointmentNoShow } from "@/features/admin-appointment-lifecycle/hooks/useMarkAppointmentNoShow";
import {
  ActorSummary,
  LifecycleEdge,
  LifecycleNode,
  LifecycleNodeDetail,
  LifecyclePhase,
  LifecycleWarning,
} from "@/features/admin-appointment-lifecycle/types/admin-appointment-lifecycle.types";
import {
  badgeToneClass,
  edgeForNode,
  formatActorConfidenceLabel,
  formatActorLabel,
  formatActorMeta,
  formatEdgeStatusLabel,
  formatLifecycleNodeLabel,
  formatPhaseLabel,
  formatStatusLabel,
  formatTimestamp,
  getActorConfidenceTone,
  getEdgeTone,
  getNodeStatusTone,
  getStatusTone,
  getWarningTone,
  groupNodesByPhase,
  isNoShowLifecycleNode,
  snapshotValueToText,
  warningLabel,
} from "@/features/admin-appointment-lifecycle/utils/lifecycle-formatters";

const Pill = ({
  children,
  tone = "gray",
  className,
}: {
  children: React.ReactNode;
  tone?: Parameters<typeof badgeToneClass>[0];
  className?: string;
}) => (
  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", badgeToneClass(tone), className)}>
    {children}
  </span>
);

const SIDE_ROUTE_PHASES = new Set(["SLOT", "COMMUNICATION", "CANCELLATION", "RESCHEDULE", "UNLINKED"]);
const MAIN_PROGRESS_PHASES = new Set([
  "BOOKING",
  "DEPOSIT",
  "ASSIGNMENT",
  "CONFIRMATION",
  "VISIT",
  "ENCOUNTER",
  "BILLING",
  "PAYMENT",
]);

type MilestoneVisualState = "active" | "complete" | "problem" | "missing" | "legacy" | "soft";

const isSideRoutePhase = (phase?: LifecyclePhase | null): boolean => SIDE_ROUTE_PHASES.has(String(phase ?? ""));

const isMainProgressPhase = (phase?: LifecyclePhase | null): boolean => MAIN_PROGRESS_PHASES.has(String(phase ?? ""));

const hasWarningSignal = (warnings?: LifecycleWarning[]): boolean => {
  return Boolean(warnings?.some((warning) => ["WARN", "ERROR"].includes(String(warning.severity ?? "").toUpperCase())));
};

const isWeakOrSideEdge = (edge?: LifecycleEdge): boolean => {
  return ["WEAK_LINK", "INFERRED", "MISSING"].includes(String(edge?.edgeStatus ?? "").toUpperCase());
};

const getMilestoneVisualState = (
  node: LifecycleNode,
  selected: boolean,
  latestMajor: boolean
): MilestoneVisualState => {
  const status = String(node.nodeStatus ?? "").toUpperCase();

  if (selected || latestMajor) return "active";
  if (status === "CONFLICT" || hasWarningSignal(node.warnings)) return "problem";
  if (status === "MISSING") return "missing";
  if (status === "LEGACY" || status === "UNKNOWN") return "legacy";
  if (status === "OK" || status === "PARTIAL") return "complete";

  return "soft";
};

const milestoneCardClass = (state: MilestoneVisualState, sideRoute: boolean): string => {
  const base = sideRoute
    ? "border-dashed bg-slate-50/80 dark:bg-slate-950/40"
    : "bg-background";

  const stateClass: Record<MilestoneVisualState, string> = {
    active:
      "border-sky-500 bg-sky-50 shadow-md shadow-sky-100 ring-2 ring-sky-200 dark:border-sky-700 dark:bg-sky-950/40 dark:shadow-none dark:ring-sky-900/50",
    complete:
      "border-emerald-200 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-emerald-900/50 dark:hover:bg-emerald-950/20",
    problem:
      "border-rose-300 bg-rose-50/60 shadow-sm hover:border-rose-400 dark:border-rose-900/60 dark:bg-rose-950/25",
    missing:
      "border-amber-300 bg-amber-50/60 shadow-sm hover:border-amber-400 dark:border-amber-900/60 dark:bg-amber-950/25",
    legacy:
      "border-violet-200 bg-violet-50/50 shadow-sm hover:border-violet-300 dark:border-violet-900/60 dark:bg-violet-950/25",
    soft:
      "border-slate-200 shadow-sm hover:border-sky-200 hover:bg-sky-50/40 dark:border-slate-800 dark:hover:bg-sky-950/20",
  };

  return cn(base, stateClass[state]);
};

const milestoneMarkerClass = (state: MilestoneVisualState, sideRoute: boolean): string => {
  const stateClass: Record<MilestoneVisualState, string> = {
    active:
      "border-sky-500 bg-sky-600 text-white shadow-lg shadow-sky-200 ring-4 ring-sky-100 dark:border-sky-400 dark:shadow-none dark:ring-sky-950",
    complete:
      "border-emerald-500 bg-emerald-600 text-white ring-4 ring-emerald-50 dark:ring-emerald-950",
    problem:
      "border-rose-500 bg-rose-600 text-white ring-4 ring-rose-50 dark:ring-rose-950",
    missing:
      "border-amber-500 bg-amber-500 text-white ring-4 ring-amber-50 dark:ring-amber-950",
    legacy:
      "border-violet-400 bg-violet-500 text-white ring-4 ring-violet-50 dark:ring-violet-950",
    soft:
      "border-slate-300 bg-background text-slate-500 ring-4 ring-slate-50 dark:border-slate-700 dark:ring-slate-950",
  };

  return cn(
    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
    sideRoute && "h-7 w-7 border-dashed",
    stateClass[state]
  );
};

const MilestoneIcon = ({ state }: { state: MilestoneVisualState }) => {
  if (state === "complete") return <CheckCircle2 className="h-4 w-4" />;
  if (state === "active") return <Flag className="h-4 w-4" />;
  if (state === "problem") return <AlertTriangle className="h-4 w-4" />;
  if (state === "missing" || state === "legacy") return <CircleDashed className="h-4 w-4" />;
  return <Circle className="h-4 w-4" />;
};

const WarningChips = ({ warnings = [], compact = false }: { warnings?: LifecycleWarning[]; compact?: boolean }) => {
  if (!warnings.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {warnings.map((warning, index) => (
        <Pill key={`${warning.code}-${index}`} tone={getWarningTone(warning.severity)} className={compact ? "px-2 py-0.5" : undefined}>
          <AlertTriangle className="h-3.5 w-3.5" />
          {warningLabel(warning)}
        </Pill>
      ))}
    </div>
  );
};

const ActorBlock = ({ actor }: { actor?: ActorSummary | null }) => {
  const meta = formatActorMeta(actor);

  return (
    <div className="flex items-start gap-2 text-sm">
      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{formatActorLabel(actor)}</p>
        {meta ? <p className="break-all text-xs text-muted-foreground">{meta}</p> : null}
      </div>
    </div>
  );
};

const SnapshotRows = ({ snapshot }: { snapshot?: Record<string, unknown> | null }) => {
  const entries = Object.entries(snapshot ?? {});

  if (!entries.length) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        No sanitized snapshot was provided for this node.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="divide-y">
        {entries.map(([key, value]) => (
          <div key={key} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[170px_minmax(0,1fr)]">
            <span className="font-medium text-muted-foreground">{formatStatusLabel(key)}</span>
            <span className="break-words text-foreground">{snapshotValueToText(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const NodeDetailContent = ({
  selectedNode,
  edge,
  detail,
  loading,
  error,
  onRetry,
}: {
  selectedNode: LifecycleNode | null;
  edge?: LifecycleEdge;
  detail: LifecycleNodeDetail | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) => {
  if (!selectedNode) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Select a lifecycle node to inspect its details.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 rounded-2xl border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading node detail...
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-3">
            <div>
              <p className="font-semibold">Node detail unavailable</p>
              <p>{error}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const sourceCollection = detail?.sourceMeta?.collection || selectedNode.sourceCollection || "Missing related record";
  const sourceRecordId = detail?.sourceMeta?.recordId || selectedNode.sourceRecordId || "Missing related record";
  const warnings = detail?.warnings ?? selectedNode.warnings ?? [];
  const actor = detail?.actor ?? selectedNode.actor;
  const detailHasAdditionalFields = Boolean(
    detail?.eventType ||
    detail?.phase ||
    detail?.timestamp ||
    detail?.statusBefore ||
    detail?.statusAfter ||
    detail?.actor ||
    detail?.sourceMeta ||
    detail?.domainSnapshot ||
    detail?.warnings?.length
  );

  return (
    <div className="space-y-5">
      {!detailHasAdditionalFields ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          No additional detail is available for this node.
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={getNodeStatusTone(selectedNode.nodeStatus)}>{formatStatusLabel(selectedNode.nodeStatus)}</Pill>
          <Pill tone="blue">{formatPhaseLabel(detail?.phase ?? selectedNode.phase)}</Pill>
          {detail?.complete === false ? <Pill tone="orange">Incomplete detail</Pill> : null}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{formatLifecycleNodeLabel(selectedNode)}</h3>
          <p className="text-sm text-muted-foreground">{detail?.eventType || selectedNode.eventType || "Unknown event"}</p>
        </div>
      </div>

      <Separator />

      <div className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
          <span className="text-muted-foreground">Timestamp</span>
          <span className="text-right font-medium">{formatTimestamp(detail?.timestamp ?? selectedNode.timestamp)}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status before</p>
            <p className="mt-1 font-medium">{detail?.statusBefore || selectedNode.statusBefore || "Unknown status"}</p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status after</p>
            <p className="mt-1 font-medium">{detail?.statusAfter || selectedNode.statusAfter || "Unknown status"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Actor</p>
          <Pill tone={getActorConfidenceTone(actor?.actorConfidence)}>
            {formatActorConfidenceLabel(actor?.actorConfidence)}
          </Pill>
        </div>
        <ActorBlock actor={actor} />
        {actor?.actorWarnings?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {actor.actorWarnings.map((warning) => (
              <Pill key={warning} tone="orange">{warning}</Pill>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-3">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Source collection
          </p>
          <p className="mt-1 break-all font-medium">{sourceCollection}</p>
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Source record id</p>
          <p className="mt-1 break-all font-medium">{sourceRecordId}</p>
        </div>
      </div>

      {edge ? (
        <div className="rounded-xl border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Edge confidence</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill tone={getEdgeTone(edge.edgeStatus)}>{formatEdgeStatusLabel(edge.edgeStatus)}</Pill>
            <WarningChips warnings={edge.warnings} compact />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="font-semibold">Warnings</p>
        {warnings.length ? (
          <WarningChips warnings={warnings} />
        ) : (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">No node warnings.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Sanitized domain snapshot</p>
        <SnapshotRows snapshot={detail?.domainSnapshot} />
      </div>
    </div>
  );
};

const NodeCard = ({
  node,
  edge,
  selected,
  latestMajor,
  sideRoute,
  onSelect,
}: {
  node: LifecycleNode;
  edge?: LifecycleEdge;
  selected: boolean;
  latestMajor: boolean;
  sideRoute: boolean;
  onSelect: () => void;
}) => {
  const visualState = getMilestoneVisualState(node, selected, latestMajor);
  const noShowNode = isNoShowLifecycleNode(node);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
        milestoneCardClass(visualState, sideRoute)
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1 transition-all",
          visualState === "active" && "bg-sky-500",
          visualState === "complete" && "bg-emerald-500",
          visualState === "problem" && "bg-rose-500",
          visualState === "missing" && "bg-amber-500",
          visualState === "legacy" && "bg-violet-500",
          visualState === "soft" && "bg-slate-200 dark:bg-slate-800"
        )}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1 pl-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{formatLifecycleNodeLabel(node)}</p>
            {latestMajor ? <Pill tone="blue">Current stage</Pill> : null}
            {noShowNode ? <Pill tone="orange">Terminal outcome</Pill> : null}
            {sideRoute ? <Pill tone="gray">Side branch</Pill> : null}
          </div>
          <p className="break-all text-xs uppercase tracking-wide text-muted-foreground">{node.eventType || "UNKNOWN_EVENT"}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Pill tone={getNodeStatusTone(node.nodeStatus)}>{formatStatusLabel(node.nodeStatus)}</Pill>
          {edge ? <Pill tone={getEdgeTone(edge.edgeStatus)}>{formatEdgeStatusLabel(edge.edgeStatus)}</Pill> : null}
        </div>
      </div>

      <div className="mt-3 grid gap-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span>{formatTimestamp(node.timestamp)}</span>
        </div>
        <ActorBlock actor={node.actor} />
      </div>

      {node.summary && Object.keys(node.summary).length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(node.summary).slice(0, 3).map(([key, value]) => (
            <Pill key={key} tone="gray">
              {formatStatusLabel(key)}: {snapshotValueToText(value)}
            </Pill>
          ))}
        </div>
      ) : null}

      {node.warnings?.length ? (
        <div className="mt-3">
          <WarningChips warnings={node.warnings} compact />
        </div>
      ) : null}
    </button>
  );
};

export default function AdminAppointmentLifecycleDetailScreen({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const { tree, loading, refreshing, error, refresh } = useAdminAppointmentLifecycle(appointmentId);
  const { markingAppointmentId, markNoShow } = useMarkAppointmentNoShow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({
    COMMUNICATION: true,
  });

  const shouldUseMobileDetailDialog = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1279px)").matches;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = (localStorage.getItem("role") || "").toUpperCase();
    if (role && role !== "ADMIN") {
      toast.error("Only admins can view appointment lifecycle data.");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!tree?.nodes?.length) return;
    setSelectedNodeId((current) => current ?? tree.rootNodeId ?? tree.nodes[0]?.id ?? null);
  }, [tree]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const closeDesktopDialog = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setMobileDetailOpen(false);
    };

    closeDesktopDialog(mediaQuery);
    mediaQuery.addEventListener("change", closeDesktopDialog);

    return () => mediaQuery.removeEventListener("change", closeDesktopDialog);
  }, []);

  const groupedPhases = useMemo(() => groupNodesByPhase(tree?.nodes ?? [], tree?.phases ?? []), [tree]);
  const selectedNode = useMemo(
    () => tree?.nodes?.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, tree]
  );
  const selectedEdge = useMemo(
    () => (selectedNodeId ? edgeForNode(tree?.edges ?? [], selectedNodeId) : undefined),
    [selectedNodeId, tree]
  );
  const latestMajorNode = useMemo(() => {
    const nodes = tree?.nodes ?? [];
    const noShowNodes = nodes.filter(
      (node) => isNoShowLifecycleNode(node) && node.timestamp !== null
    );
    if (noShowNodes.length) {
      return [...noShowNodes].sort(
        (a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0)
      )[0];
    }

    const mainNodes = nodes.filter((node) => isMainProgressPhase(node.phase) && node.timestamp !== null);
    const candidates = mainNodes.length ? mainNodes : nodes.filter((node) => node.timestamp !== null);

    if (!candidates.length) return nodes.find((node) => isMainProgressPhase(node.phase)) ?? nodes[0] ?? null;

    return [...candidates].sort((a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0))[0] ?? null;
  }, [tree]);
  const totalWarningCount = useMemo(() => {
    const nodeWarnings = tree?.nodes?.reduce((count, node) => count + (node.warnings?.length ?? 0), 0) ?? 0;
    const edgeWarnings = tree?.edges?.reduce((count, edge) => count + (edge.warnings?.length ?? 0), 0) ?? 0;
    return nodeWarnings + edgeWarnings + (tree?.globalWarnings?.length ?? 0);
  }, [tree]);
  const completedPhaseCount = useMemo(() => {
    return (tree?.phases ?? []).filter((phase) => isMainProgressPhase(phase.phase) && phase.status === "OK").length;
  }, [tree]);
  const nodeDetail = useLifecycleNodeDetail(appointmentId, selectedNodeId);

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setMobileDetailOpen(shouldUseMobileDetailDialog());
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="cursor-default border-rose-200 shadow-sm transition-none hover:scale-100 hover:shadow-sm dark:border-rose-900/50">
        <CardContent className="space-y-4 p-6">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/admin/appointments">
              <ArrowLeft className="h-4 w-4" />
              Back to appointments
            </Link>
          </Button>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-3">
                <div>
                  <p className="font-semibold">Unable to load lifecycle</p>
                  <p className="text-sm">{error}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => refresh()}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tree) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Appointment lifecycle is unavailable.
      </div>
    );
  }

  const globalWarnings = tree.globalWarnings ?? [];
  const appointment = tree.appointment;
  const canMarkNoShow =
    appointment.appointmentStatus === "CONFIRMED" &&
    appointment.scheduledAt !== null &&
    appointment.scheduledAt < Date.now();

  return (
    <div className="space-y-5">
      <Card className="cursor-default overflow-hidden border-sky-200/70 shadow-sm transition-none hover:scale-100 hover:shadow-sm dark:border-sky-900/40">
        <CardHeader className="border-b border-sky-100/80 bg-gradient-to-r from-sky-50 via-white to-emerald-50 dark:border-sky-900/40 dark:from-sky-950/40 dark:via-gray-950 dark:to-emerald-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Button asChild variant="outline" size="sm" className="w-fit gap-2">
                <Link href="/admin/appointments">
                  <ArrowLeft className="h-4 w-4" />
                  Back to appointments
                </Link>
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <GitBranch className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                  Lifecycle tree
                </CardTitle>
                <CardDescription className="mt-2 break-all">Appointment ID: {appointment.id || appointmentId}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone={getStatusTone(appointment.appointmentStatus)}>
                  {formatStatusLabel(appointment.appointmentStatus)}
                </Pill>
                <Pill tone={getStatusTone(appointment.depositStatus)}>
                  Deposit: {formatStatusLabel(appointment.depositStatus)}
                </Pill>
                <Pill tone={getStatusTone(appointment.assignmentStatus)}>
                  Assignment: {formatStatusLabel(appointment.assignmentStatus)}
                </Pill>
                {tree.reconstruction?.partial ? <Pill tone="orange">Reconstructed from incomplete data</Pill> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canMarkNoShow ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 border-slate-300 text-slate-700"
                  onClick={() => {
                    if (!window.confirm("Đánh dấu bệnh nhân không đến khám cho lịch này?")) return;
                    void markNoShow(appointment.id || appointmentId, () => refresh());
                  }}
                  disabled={Boolean(markingAppointmentId)}
                >
                  <UserX className="h-4 w-4" />
                  {markingAppointmentId ? "Đang xử lý..." : "Đánh dấu không đến khám"}
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => refresh()} disabled={refreshing} className="gap-2">
                <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Patient</p>
            <p className="mt-1 break-all font-semibold">{appointment.patient?.name || "Missing related record"}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Doctor</p>
            <p className="mt-1 font-semibold">{appointment.doctor?.name || "Missing related record"}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Scheduled</p>
            <p className="mt-1 font-semibold">{formatTimestamp(appointment.scheduledAt)}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Generated</p>
            <p className="mt-1 font-semibold">{formatTimestamp(tree.reconstruction?.generatedAt)}</p>
          </div>
        </CardContent>
      </Card>

      {appointment.appointmentStatus === "NO_SHOW" ? (
        <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <div className="flex items-start gap-3">
            <UserX className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Không đến khám</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {appointment.noShowActor === "SYSTEM"
                  ? "Được hệ thống ghi nhận qua đối soát tự động."
                  : appointment.noShowActor === "STAFF" || appointment.noShowSource === "MANUAL"
                    ? "Được nhân viên lễ tân hoặc quản trị viên đánh dấu thủ công."
                    : "Nguồn ghi nhận được hiển thị trong các node lifecycle bên dưới."}
                {appointment.noShowAt ? ` Thời điểm: ${formatTimestamp(appointment.noShowAt)}.` : ""}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="cursor-default overflow-hidden border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-white to-sky-50 shadow-sm transition-none hover:scale-100 hover:shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-gray-950 dark:to-sky-950/30">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-white/80 p-4 dark:bg-gray-950/70">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Flag className="h-3.5 w-3.5 text-sky-600" />
              Current stage
            </p>
            <p className="mt-1 font-semibold">{latestMajorNode ? formatPhaseLabel(latestMajorNode.phase) : "Unknown status"}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{latestMajorNode?.label || "No current milestone"}</p>
          </div>
          <div className="rounded-xl border bg-white/80 p-4 dark:bg-gray-950/70">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Main path progress
            </p>
            <p className="mt-1 font-semibold">{completedPhaseCount} / {MAIN_PROGRESS_PHASES.size} chapters complete</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, Math.round((completedPhaseCount / MAIN_PROGRESS_PHASES.size) * 100))}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl border bg-white/80 p-4 dark:bg-gray-950/70">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Signals
            </p>
            <p className="mt-1 font-semibold">{totalWarningCount} warning{totalWarningCount === 1 ? "" : "s"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Warnings, weak edges, and anomalies stay visible on the map.</p>
          </div>
          <div className="rounded-xl border bg-white/80 p-4 dark:bg-gray-950/70">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <MapPinned className="h-3.5 w-3.5 text-violet-600" />
              Reconstruction
            </p>
            <p className="mt-1 font-semibold">{tree.reconstruction?.partial ? "Partial journey" : "Complete best effort"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tree.reconstruction?.strategy || "DOMAIN_FIRST"}</p>
          </div>
        </CardContent>
      </Card>

      {globalWarnings.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <FileWarning className="h-5 w-5" />
            Reconstruction warnings
          </div>
          <WarningChips warnings={globalWarnings} />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-3xl border bg-white p-4 shadow-sm dark:bg-gray-950/80 md:p-6">
          <div className="mb-5 flex flex-col gap-3 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <MapPinned className="h-5 w-5 text-sky-600" />
                Journey map
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Main appointment milestones follow the primary rail. Optional, inferred, weak, and exceptional records branch to the side.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill tone="green">Completed</Pill>
              <Pill tone="blue">Current</Pill>
              <Pill tone="orange">Warning</Pill>
              <Pill tone="purple">Legacy</Pill>
            </div>
          </div>

          {groupedPhases.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No lifecycle nodes were reconstructed for this appointment.
            </div>
          ) : (
            <div className="relative space-y-6 before:pointer-events-none before:absolute before:bottom-8 before:left-[25px] before:top-8 before:w-1 before:rounded-full before:bg-gradient-to-b before:from-emerald-400 before:via-sky-400 before:to-slate-200 dark:before:from-emerald-700 dark:before:via-sky-700 dark:before:to-slate-800">
              {groupedPhases.map((group, groupIndex) => {
              const collapsed = collapsedPhases[group.phase] ?? false;
              const sidePhase = isSideRoutePhase(group.phase);
              const phaseTone = getNodeStatusTone(group.phaseSummary?.status);

              return (
                <section
                  key={group.phase}
                  className={cn(
                    "relative grid gap-3 transition-all md:grid-cols-[52px_minmax(0,1fr)]",
                    sidePhase && "md:ml-10"
                  )}
                >
                  {sidePhase ? (
                    <div className="pointer-events-none absolute left-[24px] top-7 hidden h-px w-10 border-t border-dashed border-slate-300 dark:border-slate-700 md:block" />
                  ) : null}

                  <div className="relative z-10 flex justify-start md:justify-center">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background shadow-sm",
                        badgeToneClass(phaseTone),
                        sidePhase && "h-10 w-10 border-dashed"
                      )}
                    >
                      {sidePhase ? <Split className="h-5 w-5" /> : groupIndex === 0 ? <Flag className="h-5 w-5" /> : <MapPinned className="h-5 w-5" />}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "overflow-hidden rounded-3xl border bg-background shadow-sm",
                      sidePhase
                        ? "border-dashed border-slate-300 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40"
                        : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                  <button
                    type="button"
                    onClick={() => setCollapsedPhases((current) => ({ ...current, [group.phase]: !collapsed }))}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 border-b px-5 py-4 text-left",
                        sidePhase
                          ? "bg-slate-100/70 dark:bg-slate-900/60"
                          : "bg-gradient-to-r from-sky-50 via-white to-emerald-50 dark:from-sky-950/30 dark:via-gray-950 dark:to-emerald-950/20"
                      )}
                  >
                    <div className="flex items-center gap-3">
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", sidePhase ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300")}>
                        {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                      <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{formatPhaseLabel(group.phase)}</p>
                            <Pill tone={sidePhase ? "gray" : "blue"}>{sidePhase ? "Side route" : "Main chapter"}</Pill>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {group.nodes.length} milestone{group.nodes.length === 1 ? "" : "s"} on this chapter
                          </p>
                      </div>
                    </div>
                    <Pill tone={getNodeStatusTone(group.phaseSummary?.status)}>
                      {formatStatusLabel(group.phaseSummary?.status, group.nodes.length ? "Unknown status" : "Missing related record")}
                    </Pill>
                  </button>

                  {!collapsed ? (
                      <div className="space-y-5 p-5">
                      {group.nodes.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          No concrete lifecycle nodes in this phase.
                        </div>
                      ) : (
                          <div className="relative space-y-5 pl-12 before:pointer-events-none before:absolute before:bottom-6 before:left-[17px] before:top-6 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                            {group.nodes.map((node) => {
                              const edge = edgeForNode(tree.edges, node.id);
                              const nodeSideRoute = sidePhase || isWeakOrSideEdge(edge);
                              const latestMajor = latestMajorNode?.id === node.id;
                              const visualState = getMilestoneVisualState(node, selectedNodeId === node.id, latestMajor);

                              return (
                                <div
                                  key={node.id}
                                  className={cn(
                                    "relative",
                                    nodeSideRoute && !sidePhase && "md:ml-8"
                                  )}
                                >
                                  {nodeSideRoute ? (
                                    <span className="pointer-events-none absolute -left-[30px] top-6 h-px w-7 border-t border-dashed border-slate-300 dark:border-slate-700" />
                                  ) : null}
                                  <span className={cn("pointer-events-none absolute -left-[42px] top-3 z-10", nodeSideRoute && "-left-[38px]")}>
                                    <span className={milestoneMarkerClass(visualState, nodeSideRoute)}>
                                      <MilestoneIcon state={visualState} />
                                    </span>
                                  </span>
                              <NodeCard
                                node={node}
                                    edge={edge}
                                selected={selectedNodeId === node.id}
                                    latestMajor={latestMajor}
                                    sideRoute={nodeSideRoute}
                                onSelect={() => selectNode(node.id)}
                              />
                            </div>
                              );
                            })}
                        </div>
                      )}
                      </div>
                  ) : null}
                  </div>
                </section>
              );
              })}
            </div>
          )}
        </div>

        <aside className="hidden xl:block">
          <Card className="sticky top-6 max-h-[calc(100vh-3rem)] cursor-default overflow-y-auto border shadow-sm transition-none hover:scale-100 hover:shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Node detail</CardTitle>
              <CardDescription>Lazy-loaded sanitized source detail for the selected lifecycle node.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <NodeDetailContent
                selectedNode={selectedNode}
                edge={selectedEdge}
                detail={nodeDetail.detail}
                loading={nodeDetail.loading}
                error={nodeDetail.error}
                onRetry={() => void nodeDetail.retry()}
              />
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl xl:hidden">
          <DialogHeader>
            <DialogTitle>Node detail</DialogTitle>
            <DialogDescription>Sanitized lifecycle source details.</DialogDescription>
          </DialogHeader>
          <NodeDetailContent
            selectedNode={selectedNode}
            edge={selectedEdge}
            detail={nodeDetail.detail}
            loading={nodeDetail.loading}
            error={nodeDetail.error}
            onRetry={() => void nodeDetail.retry()}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

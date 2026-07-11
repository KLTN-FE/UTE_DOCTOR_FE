import {
  ActorConfidence,
  ActorSummary,
  GroupedLifecyclePhase,
  LifecycleEdge,
  LifecycleEdgeStatus,
  LifecycleNode,
  LifecycleNodeStatus,
  LifecyclePhase,
  LifecyclePhaseSummary,
  LifecycleWarning,
  LifecycleWarningSeverity,
} from "@/features/admin-appointment-lifecycle/types/admin-appointment-lifecycle.types";
import { formatApiDateToLocalDateTime } from "@/utils/time.util";

export const PHASE_ORDER: LifecyclePhase[] = [
  "BOOKING",
  "DEPOSIT",
  "ASSIGNMENT",
  "CONFIRMATION",
  "VISIT",
  "ENCOUNTER",
  "BILLING",
  "PAYMENT",
  "SLOT",
  "COMMUNICATION",
  "CANCELLATION",
  "RESCHEDULE",
  "UNLINKED",
];

const PHASE_LABELS: Record<string, string> = {
  BOOKING: "Booking",
  DEPOSIT: "Deposit",
  ASSIGNMENT: "Assignment",
  CONFIRMATION: "Confirmation",
  VISIT: "Visit",
  ENCOUNTER: "Encounter",
  BILLING: "Billing",
  PAYMENT: "Payment",
  SLOT: "Slot",
  COMMUNICATION: "Communications",
  CANCELLATION: "Cancellation",
  RESCHEDULE: "Reschedule",
  UNLINKED: "Unlinked",
};

const STATUS_LABELS: Record<string, string> = {
  AWAITING_ASSIGNMENT: "Awaiting assignment",
  NOT_REQUIRED: "Not required",
  DICH_VU: "Service",
  BHYT: "Insurance",
  NO_SHOW: "Không đến khám",
  STAFF: "Nhân viên",
  MANUAL: "Thủ công",
  STARTUP: "Đối soát khi khởi động",
  DAILY_06AM: "Đối soát hằng ngày",
};

const EDGE_LABELS: Record<string, string> = {
  STRONG_LINK: "Strong link",
  WEAK_LINK: "Weak link",
  INFERRED: "Inferred",
  MISSING: "Missing link",
};

const ACTOR_CONFIDENCE_LABELS: Record<string, string> = {
  EXACT: "Exact actor",
  ROLE_INFERRED: "Role inferred",
  SYSTEM_INFERRED: "System inferred",
  UNKNOWN: "Unknown actor",
};

export type BadgeTone = "green" | "blue" | "orange" | "red" | "gray" | "purple" | "amber";

export const badgeToneClass = (tone: BadgeTone): string => {
  const classes: Record<BadgeTone, string> = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    blue: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
    orange: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    amber: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-300",
    red: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
    gray: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300",
    purple: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
  };

  return classes[tone];
};

export const formatStatusLabel = (status?: string | null, fallback = "Unknown status"): string => {
  if (!status) return fallback;
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getStatusTone = (status?: string | null): BadgeTone => {
  switch ((status ?? "").toUpperCase()) {
    case "OK":
    case "PAID":
    case "COMPLETED":
    case "CONFIRMED":
    case "ASSIGNED":
      return "green";
    case "PENDING":
    case "AWAITING_ASSIGNMENT":
    case "PARTIAL":
    case "IN_PROGRESS":
      return "orange";
    case "FAILED":
    case "CANCELLED":
    case "CONFLICT":
    case "ERROR":
    case "MISSING":
      return "red";
    case "NO_SHOW":
      return "orange";
    case "LEGACY":
    case "UNKNOWN":
      return "gray";
    case "REFUNDED":
    case "FORFEITED":
      return "purple";
    default:
      return "gray";
  }
};

export const getNodeStatusTone = (status?: LifecycleNodeStatus | null): BadgeTone => {
  switch ((status ?? "").toUpperCase()) {
    case "OK":
      return "green";
    case "PARTIAL":
      return "orange";
    case "MISSING":
    case "CONFLICT":
      return "red";
    case "LEGACY":
      return "purple";
    case "UNKNOWN":
    default:
      return "gray";
  }
};

export const getWarningTone = (severity?: LifecycleWarningSeverity | null): BadgeTone => {
  switch ((severity ?? "").toUpperCase()) {
    case "ERROR":
      return "red";
    case "WARN":
      return "orange";
    case "INFO":
      return "blue";
    default:
      return "gray";
  }
};

export const getActorConfidenceTone = (confidence?: ActorConfidence | null): BadgeTone => {
  switch ((confidence ?? "").toUpperCase()) {
    case "EXACT":
      return "green";
    case "ROLE_INFERRED":
      return "blue";
    case "SYSTEM_INFERRED":
      return "purple";
    case "UNKNOWN":
    default:
      return "gray";
  }
};

export const getEdgeTone = (edgeStatus?: LifecycleEdgeStatus | null): BadgeTone => {
  switch ((edgeStatus ?? "").toUpperCase()) {
    case "STRONG_LINK":
      return "green";
    case "WEAK_LINK":
      return "orange";
    case "INFERRED":
      return "blue";
    case "MISSING":
      return "red";
    default:
      return "gray";
  }
};

export const formatPhaseLabel = (phase?: LifecyclePhase | null): string => {
  if (!phase) return "Unlinked event";
  return PHASE_LABELS[phase] ?? formatStatusLabel(phase, "Unlinked event");
};

export const phaseSortIndex = (phase?: LifecyclePhase | null): number => {
  const index = PHASE_ORDER.indexOf(String(phase ?? "") as LifecyclePhase);
  return index >= 0 ? index : PHASE_ORDER.length;
};

export const formatTimestamp = (timestamp?: number | null): string => {
  if (timestamp === null || timestamp === undefined) return "Time unknown";
  const formatted = formatApiDateToLocalDateTime(timestamp, "vi-VN", true);
  return formatted.includes("--/--/----") ? "Time unknown" : formatted;
};

export const formatActorLabel = (actor?: ActorSummary | null): string => {
  if (!actor) return "Unknown actor";
  const confidence = actor.actorConfidence;

  if (confidence === "SYSTEM_INFERRED" || actor.actorType === "SYSTEM") return "System";

  if (confidence === "ROLE_INFERRED") {
    return actor.actorRole ? `${formatStatusLabel(actor.actorRole)} (inferred)` : "Role inferred";
  }

  if (confidence === "EXACT") {
    return actor.actorName || actor.actorRole || "Unknown actor";
  }

  return actor.actorName || actor.actorRole || "Unknown actor";
};

export const isNoShowLifecycleNode = (node?: LifecycleNode | null): boolean => {
  if (!node) return false;
  return [node.eventType, node.statusAfter, node.label]
    .filter(Boolean)
    .some((value) => String(value).toUpperCase().includes("NO_SHOW"));
};

export const formatLifecycleNodeLabel = (node: LifecycleNode): string => {
  if (isNoShowLifecycleNode(node)) {
    if (String(node.eventType).toUpperCase() === "VISIT_NO_SHOW") {
      return "Lượt khám: Không đến khám";
    }
    return "Không đến khám";
  }

  return node.label || "Unlinked event";
};

export const formatActorMeta = (actor?: ActorSummary | null): string => {
  if (!actor) return "";
  const parts = [actor.actorRole].filter(Boolean);
  return parts.join(" - ");
};

export const formatActorConfidenceLabel = (confidence?: ActorConfidence | null): string => {
  if (!confidence) return "Unknown actor";
  return ACTOR_CONFIDENCE_LABELS[confidence] ?? formatStatusLabel(confidence, "Unknown actor");
};

export const formatEdgeStatusLabel = (status?: LifecycleEdgeStatus | null): string => {
  if (!status) return "Missing link";
  return EDGE_LABELS[status] ?? formatStatusLabel(status, "Missing link");
};

export const warningLabel = (warning: LifecycleWarning): string => {
  return warning.message || warning.code || "Legacy data";
};

export const groupNodesByPhase = (
  nodes: LifecycleNode[] = [],
  phaseSummaries: LifecyclePhaseSummary[] = []
): GroupedLifecyclePhase[] => {
  const summaryByPhase = new Map(phaseSummaries.map((summary) => [summary.phase, summary]));
  const grouped = new Map<LifecyclePhase, LifecycleNode[]>();

  nodes.forEach((node) => {
    const phase = node.phase || "UNLINKED";
    grouped.set(phase, [...(grouped.get(phase) ?? []), node]);
  });

  phaseSummaries.forEach((summary) => {
    if (!grouped.has(summary.phase)) grouped.set(summary.phase, []);
  });

  return Array.from(grouped.entries())
    .map(([phase, phaseNodes]) => ({
      phase,
      phaseSummary: summaryByPhase.get(phase),
      nodes: [...phaseNodes].sort((a, b) => {
        if (a.timestamp === null && b.timestamp === null) return a.label.localeCompare(b.label);
        if (a.timestamp === null) return 1;
        if (b.timestamp === null) return -1;
        return a.timestamp - b.timestamp;
      }),
    }))
    .sort((a, b) => {
      const phaseDelta = phaseSortIndex(a.phase) - phaseSortIndex(b.phase);
      if (phaseDelta !== 0) return phaseDelta;
      return String(a.phase).localeCompare(String(b.phase));
    });
};

export const edgeForNode = (edges: LifecycleEdge[] = [], nodeId: string): LifecycleEdge | undefined => {
  return edges.find((edge) => edge.to === nodeId);
};

export const snapshotValueToText = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Missing related record";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") {
    const count = (value as { count?: unknown }).count;
    if (typeof count === "number") return `${count} item${count === 1 ? "" : "s"}`;
    return "Sanitized object";
  }

  return String(value);
};

export const normalizeDateInputToEpochMs = (dateValue: string, endOfDay = false): number | undefined => {
  if (!dateValue) return undefined;
  const date = new Date(`${dateValue}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  const time = date.getTime();
  return Number.isFinite(time) ? time : undefined;
};

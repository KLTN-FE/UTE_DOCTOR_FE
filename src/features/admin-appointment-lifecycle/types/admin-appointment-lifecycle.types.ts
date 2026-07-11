export type AdminAppointmentSort =
  | "bookingDate:asc"
  | "bookingDate:desc"
  | "scheduledAt:asc"
  | "scheduledAt:desc"
  | "updatedAt:asc"
  | "updatedAt:desc"
  | "createdAt:asc"
  | "createdAt:desc";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "RESCHEDULED"
  | string;

export type PaymentCategory = "BHYT" | "DICH_VU" | string;
export type AssignmentStatus = "NONE" | "AWAITING_ASSIGNMENT" | "ASSIGNED" | string;
export type DepositStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "FORFEITED"
  | string;

export type LifecyclePhase =
  | "BOOKING"
  | "DEPOSIT"
  | "ASSIGNMENT"
  | "CONFIRMATION"
  | "VISIT"
  | "ENCOUNTER"
  | "BILLING"
  | "PAYMENT"
  | "SLOT"
  | "COMMUNICATION"
  | "CANCELLATION"
  | "RESCHEDULE"
  | "UNLINKED"
  | string;

export type LifecycleNodeStatus = "OK" | "PARTIAL" | "MISSING" | "LEGACY" | "CONFLICT" | "UNKNOWN" | string;
export type LifecycleEdgeStatus = "STRONG_LINK" | "WEAK_LINK" | "INFERRED" | "MISSING" | string;
export type TimestampConfidence = "EXACT" | "INFERRED" | "MISSING" | string;
export type ActorType = "USER" | "SYSTEM" | "UNKNOWN" | string;
export type ActorConfidence = "EXACT" | "ROLE_INFERRED" | "SYSTEM_INFERRED" | "UNKNOWN" | string;
export type ActorSource = "STORED_FIELD" | "DOMAIN_RELATION" | "EVENT_TYPE_INFERENCE" | "FALLBACK" | string;
export type LifecycleWarningSeverity = "INFO" | "WARN" | "ERROR" | string;
export type LifecycleWarningScope = "NODE" | "EDGE" | "TREE" | string;

export interface AdminAppointmentQuery {
  page?: number;
  limit?: number;
  sort?: AdminAppointmentSort;
  status?: string;
  paymentCategory?: string;
  assignmentStatus?: string;
  depositStatus?: string;
  doctorId?: string;
  patientEmail?: string;
  dateFrom?: number;
  dateTo?: number;
}

export interface AdminAppointmentSummary {
  appointmentId: string;
  patient: { name?: string | null } | null;
  doctor: { id?: string | null; name?: string | null } | null;
  appointmentStatus: AppointmentStatus | null;
  assignmentStatus: AssignmentStatus | null;
  depositStatus: DepositStatus | null;
  paymentCategory: PaymentCategory | null;
  visitStatus: string | null;
  billingStatus: string | null;
  bookingDate: number | null;
  scheduledAt: number | null;
  hasWarnings: boolean;
  noShowAt?: number | null;
  noShowActor?: string | null;
  noShowSource?: string | null;
  noShowMarkedByAccountId?: string | null;
}

export interface AdminAppointmentsPageResult {
  items: AdminAppointmentSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface ActorSummary {
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  actorType?: ActorType;
  actorConfidence?: ActorConfidence;
  actorSource?: ActorSource;
  actorWarnings?: string[];
}

export interface LifecycleWarning {
  code: string;
  message: string;
  severity: LifecycleWarningSeverity;
  scope: LifecycleWarningScope;
  relatedNodeId?: string;
}

export interface LifecycleNode {
  id: string;
  phase: LifecyclePhase;
  eventType: string;
  label: string;
  labelKey?: string;
  timestamp: number | null;
  timestampConfidence: TimestampConfidence;
  statusBefore?: string | null;
  statusAfter?: string | null;
  nodeStatus: LifecycleNodeStatus;
  actor?: ActorSummary | null;
  sourceCollection?: string | null;
  sourceRecordId?: string | null;
  parentId?: string | null;
  summary?: Record<string, unknown> | null;
  warnings?: LifecycleWarning[];
  hasDetail?: boolean;
}

export interface LifecycleEdge {
  from: string;
  to: string;
  edgeStatus: LifecycleEdgeStatus;
  warnings?: LifecycleWarning[];
}

export interface LifecyclePhaseSummary {
  phase: LifecyclePhase;
  status: LifecycleNodeStatus;
  nodeCount: number;
}

export interface LifecycleTree {
  appointment: {
    id: string;
    appointmentStatus: AppointmentStatus | null;
    assignmentStatus: AssignmentStatus | null;
    paymentCategory: PaymentCategory | null;
    depositStatus: DepositStatus | null;
    scheduledAt: number | null;
    bookingDate: number | null;
    patient?: { name?: string | null } | null;
    doctor?: { id?: string | null; name?: string | null } | null;
    noShowAt?: number | null;
    noShowActor?: string | null;
    noShowSource?: string | null;
    noShowMarkedByAccountId?: string | null;
  };
  rootNodeId: string;
  nodes: LifecycleNode[];
  edges: LifecycleEdge[];
  phases: LifecyclePhaseSummary[];
  globalWarnings: LifecycleWarning[];
  reconstruction: {
    strategy: "DOMAIN_FIRST" | string;
    generatedAt: number | null;
    partial: boolean;
  };
}

export interface LifecycleNodeDetail {
  nodeId: string;
  eventType: string;
  phase: LifecyclePhase;
  timestamp: number | null;
  statusBefore?: string | null;
  statusAfter?: string | null;
  actor?: ActorSummary | null;
  domainSnapshot?: Record<string, unknown> | null;
  sourceMeta?: {
    collection?: string | null;
    recordId?: string | null;
  } | null;
  warnings?: LifecycleWarning[];
  complete?: boolean;
}

export interface GroupedLifecyclePhase {
  phase: LifecyclePhase;
  phaseSummary?: LifecyclePhaseSummary;
  nodes: LifecycleNode[];
}

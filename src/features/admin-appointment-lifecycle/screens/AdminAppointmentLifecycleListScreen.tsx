"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  Eye,
  Filter,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAdminAppointments } from "@/features/admin-appointment-lifecycle/hooks/useAdminAppointments";
import { useMarkAppointmentNoShow } from "@/features/admin-appointment-lifecycle/hooks/useMarkAppointmentNoShow";
import {
  badgeToneClass,
  formatStatusLabel,
  formatTimestamp,
  getStatusTone,
} from "@/features/admin-appointment-lifecycle/utils/lifecycle-formatters";

const APPOINTMENT_STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
  "RESCHEDULED",
  "NO_SHOW",
];
const PAYMENT_CATEGORY_OPTIONS = ["DICH_VU", "BHYT"];
const DEPOSIT_STATUS_OPTIONS = ["NOT_REQUIRED", "PENDING", "PAID", "FAILED", "REFUNDED", "FORFEITED"];
const ASSIGNMENT_STATUS_OPTIONS = ["NONE", "AWAITING_ASSIGNMENT", "ASSIGNED"];

const StatusChip = ({ value, fallback = "Unknown status" }: { value?: string | null; fallback?: string }) => (
  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", badgeToneClass(getStatusTone(value)))}>
    {formatStatusLabel(value, fallback)}
  </span>
);

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <label className="grid gap-1.5 text-sm">
    <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
    >
      <option value="ALL">All</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {formatStatusLabel(option)}
        </option>
      ))}
    </select>
  </label>
);

const TableSkeleton = () => (
  <>
    {Array.from({ length: 6 }).map((_, index) => (
      <TableRow key={index}>
        {Array.from({ length: 9 }).map((__, cellIndex) => (
          <TableCell key={cellIndex} className="py-4">
            <Skeleton className="h-5 w-full max-w-[150px]" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

export default function AdminAppointmentLifecycleListScreen() {
  const router = useRouter();
  const {
    items,
    filters,
    page,
    limit,
    total,
    totalPages,
    loading,
    refreshing,
    error,
    setPage,
    setLimit,
    updateFilter,
    resetFilters,
    refresh,
  } = useAdminAppointments();
  const { markingAppointmentId, markNoShow } = useMarkAppointmentNoShow();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = (localStorage.getItem("role") || "").toUpperCase();
    if (role && role !== "ADMIN") {
      toast.error("Only admins can view appointment lifecycle data.");
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="space-y-5">
      <Card className="cursor-default overflow-hidden border-sky-200/70 shadow-sm transition-none hover:scale-100 hover:shadow-sm dark:border-sky-900/40">
        <CardHeader className="border-b border-sky-100/80 bg-gradient-to-r from-sky-50 via-white to-emerald-50 dark:border-sky-900/40 dark:from-sky-950/40 dark:via-gray-950 dark:to-emerald-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarClock className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                Appointment Lifecycle
              </CardTitle>
              <CardDescription>
                Reconstructed, read-only lifecycle view built from appointment, payment, assignment, visit,
                billing, slot, and communication records.
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1">
                  <strong className="text-foreground">{total}</strong> appointments
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Admin only
                </span>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={() => refresh()} disabled={refreshing} className="gap-2">
              <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <div className="rounded-2xl border bg-background p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Filter className="h-4 w-4 text-sky-600" />
              Filters
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1.5 text-sm md:col-span-2 xl:col-span-1">
                <span className="font-medium text-slate-700 dark:text-slate-200">Patient email</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.patientEmail}
                    onChange={(event) => updateFilter("patientEmail", event.target.value)}
                    placeholder="patient@example.com"
                    className="pl-9"
                  />
                </div>
              </label>

              <FilterSelect
                label="Appointment status"
                value={filters.status}
                options={APPOINTMENT_STATUS_OPTIONS}
                onChange={(value) => updateFilter("status", value)}
              />
              <FilterSelect
                label="Payment category"
                value={filters.paymentCategory}
                options={PAYMENT_CATEGORY_OPTIONS}
                onChange={(value) => updateFilter("paymentCategory", value)}
              />
              <FilterSelect
                label="Deposit status"
                value={filters.depositStatus}
                options={DEPOSIT_STATUS_OPTIONS}
                onChange={(value) => updateFilter("depositStatus", value)}
              />
              <FilterSelect
                label="Assignment status"
                value={filters.assignmentStatus}
                options={ASSIGNMENT_STATUS_OPTIONS}
                onChange={(value) => updateFilter("assignmentStatus", value)}
              />

              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Scheduled from</span>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter("dateFrom", event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Scheduled to</span>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter("dateTo", event.target.value)}
                />
              </label>

              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={resetFilters} className="w-full gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset filters
                </Button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Unable to load appointments</p>
                    <p>{error}</p>
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={() => refresh()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Booking / appointment</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Visit</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Warnings</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton />
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-14 text-center">
                      <div className="mx-auto max-w-md space-y-2 text-sm text-muted-foreground">
                        <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="font-medium text-foreground">No appointments found</p>
                        <p>Try widening the date range or clearing lifecycle filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((appointment) => {
                    const canMarkNoShow =
                      appointment.appointmentStatus === "CONFIRMED" &&
                      appointment.scheduledAt !== null &&
                      appointment.scheduledAt < Date.now();

                    return (
                    <TableRow key={appointment.appointmentId} className="hover:bg-sky-50/50 dark:hover:bg-sky-950/20">
                      <TableCell className="min-w-[210px] py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{formatTimestamp(appointment.scheduledAt)}</p>
                          <p className="text-xs text-muted-foreground">Booked {formatTimestamp(appointment.bookingDate)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[190px]">
                        <p className="font-medium text-foreground">{appointment.patient?.name || "Missing related record"}</p>
                        <p className="break-all text-xs text-muted-foreground">{appointment.appointmentId}</p>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <p className="font-medium text-foreground">{appointment.doctor?.name || "Missing related record"}</p>
                        {appointment.doctor?.id ? <p className="break-all text-xs text-muted-foreground">{appointment.doctor.id}</p> : null}
                      </TableCell>
                      <TableCell>
                        <StatusChip value={appointment.appointmentStatus} />
                      </TableCell>
                      <TableCell>
                        <StatusChip value={appointment.depositStatus} />
                      </TableCell>
                      <TableCell>
                        <StatusChip value={appointment.assignmentStatus} />
                      </TableCell>
                      <TableCell>
                        <StatusChip value={appointment.visitStatus} fallback="Missing related record" />
                      </TableCell>
                      <TableCell>
                        <StatusChip value={appointment.billingStatus} fallback="Missing related record" />
                      </TableCell>
                      <TableCell>
                        {appointment.hasWarnings ? (
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", badgeToneClass("orange"))}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Warnings
                          </span>
                        ) : (
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", badgeToneClass("green"))}>
                            Clear
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canMarkNoShow ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                if (!window.confirm("Đánh dấu bệnh nhân không đến khám cho lịch này?")) return;
                                void markNoShow(appointment.appointmentId, () => refresh());
                              }}
                              disabled={Boolean(markingAppointmentId)}
                            >
                              <UserX className="h-4 w-4" />
                              {markingAppointmentId === appointment.appointmentId ? "Đang xử lý..." : "Không đến"}
                            </Button>
                          ) : null}
                          <Button asChild size="sm" variant="outline" className="gap-2">
                            <Link href={`/admin/appointments/${appointment.appointmentId}/lifecycle`}>
                              <Eye className="h-4 w-4" />
                              View lifecycle
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {loading ? "Loading appointments..." : `Page ${page} of ${totalPages} - ${total} total`}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={limit}
                onChange={(event) => {
                  setPage(1);
                  setLimit(Number(event.target.value));
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <Button type="button" variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1 || loading}>
                Previous
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || loading}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

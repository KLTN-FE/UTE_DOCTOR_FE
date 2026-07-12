import { cn } from "@/lib/utils";

/**
 * ACTIVE / INACTIVE account-status badge shared by the admin patient list and
 * the analytics frequent-patients leaderboard (req-5 PII-scoped shape).
 */
export function AccountStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const value = status ?? "UNKNOWN";
  const tone =
    value === "ACTIVE"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : value === "INACTIVE"
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        tone,
        className
      )}
    >
      {value}
    </span>
  );
}

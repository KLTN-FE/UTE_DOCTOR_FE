const TOP_N_OPTIONS = [5, 10, 20];

/** Single global Top-N selector applied uniformly to all four leaderboards. */
export function TopNSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-200">Hiển thị</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        {TOP_N_OPTIONS.map((option) => (
          <option key={option} value={option}>
            Top {option}
          </option>
        ))}
      </select>
    </label>
  );
}

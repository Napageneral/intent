export default function MetricCard({
  metric,
  label
}: {
  metric: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-card">
      <div className="text-3xl font-semibold text-gray-900">{metric}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}


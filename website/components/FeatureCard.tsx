export default function FeatureCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-card">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <div className="mt-2 text-sm text-gray-600">{children}</div>
    </div>
  );
}


export default function SectionHeading({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">
          {eyebrow}
        </div>
      )}
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-gray-600">{subtitle}</p>}
    </div>
  );
}



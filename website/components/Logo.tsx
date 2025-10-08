export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-6 w-6 rounded-md bg-gradient-to-br from-brand-500 to-brand-700" />
      <span className="font-semibold tracking-tight text-gray-900">
        Intent <span className="text-brand-600">Systems</span>
      </span>
    </div>
  );
}


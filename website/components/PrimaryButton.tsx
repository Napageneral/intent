import { clsx } from 'clsx';

export default function PrimaryButton({
  children,
  href,
  onClick,
  className
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const classes = clsx(
    'inline-flex items-center justify-center rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
    className
  );
  return href ? (
    <a href={href} className={classes}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}


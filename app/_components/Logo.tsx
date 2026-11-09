/** Home-Check logo. Colours follow the app theme, so it works on light and dark backgrounds. */
export default function Logo({
  showTagline = false,
  className = "",
}: {
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-[#14213D] dark:text-white ${className}`}>
      <svg
        viewBox="0 0 116 100"
        className={showTagline ? "h-9 w-auto shrink-0" : "h-6 w-auto shrink-0"}
        fill="none"
        aria-hidden
      >
        <path
          d="M5 52 58 6l53 46M23 42v53h70V42"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M47 92V71a11 11 0 0 1 22 0v21z" className="fill-[#C9973B] dark:fill-[#E0AE55]" />
      </svg>
      <span className="flex flex-col text-left leading-none">
        <span className={`whitespace-nowrap font-semibold tracking-tight ${showTagline ? "text-xl" : "text-base"}`}>
          Home-Check
        </span>
        {showTagline && (
          <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.3em] opacity-70">
            Real Estate
          </span>
        )}
      </span>
    </span>
  );
}

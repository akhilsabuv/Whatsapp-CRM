type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className, compact = false }: BrandMarkProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className="h-11 w-11 shrink-0 rounded-2xl shadow-[0_12px_30px_rgba(15,118,110,0.25)]"
        >
          <rect width="64" height="64" rx="18" fill="#0F172A" />
          <rect x="7" y="7" width="50" height="50" rx="14" fill="url(#brandGradient)" />
          <path
            d="M20 33c0-8.284 6.716-15 15-15h3.5A8.5 8.5 0 0 1 47 26.5 8.5 8.5 0 0 1 38.5 35H31a4 4 0 0 0 0 8h6.5"
            stroke="#FFF7ED"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="m20 46-5 4 1.5-6"
            stroke="#FCD34D"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="44" cy="44" r="6" fill="#FCD34D" />
          <path d="M41.5 44h5" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M44 41.5v5" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="brandGradient" x1="12" y1="10" x2="52" y2="55" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0F766E" />
              <stop offset="1" stopColor="#14B8A6" />
            </linearGradient>
          </defs>
        </svg>
        {!compact ? (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-teal-700">
              SignalDesk
            </p>
            <p className="text-sm font-medium text-stone-950">WhatsApp CRM</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

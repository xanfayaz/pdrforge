export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0" aria-hidden>
        <rect width="36" height="36" rx="10" fill="#121820" stroke="#2c3a4c" />
        <path d="M8 23 L18 10 L28 23" fill="none" stroke="#3c8dff" strokeWidth="2" />
        <path d="M12 23 H24" stroke="#ff7a2f" strokeWidth="2" />
        <circle cx="18" cy="16" r="1.4" fill="#ff7a2f" />
      </svg>
      {compact ? null : (
        <div>
          <div className="font-display text-sm tracking-wide">PDRForge</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[#8b97a8]">кузница заявок</div>
        </div>
      )}
    </div>
  );
}

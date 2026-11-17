export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="5.5" cy="9" r="2.6" fill="#fff" />
        <circle cx="12.5" cy="9" r="2.6" fill="none" stroke="#fff" strokeWidth="1.6" />
      </svg>
    </span>
  );
}

export function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="7" cy="7" r="5" />
      <path d="m11 11 3.5 3.5" strokeLinecap="round" />
    </svg>
  );
}

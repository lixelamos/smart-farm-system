import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Smart Farm Narok home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <circle cx="23" cy="8" r="3" />
          <path d="M3 18 12 9l8 9h9M3 23h26M3 28h26M8 23l-3 5M17 23l-3 5M26 23l-3 5" />
        </svg>
      </span>
      <span>
        Smart <span className="brand-light">Farm</span>
        <small>NAROK COUNTY</small>
      </span>
    </Link>
  );
}

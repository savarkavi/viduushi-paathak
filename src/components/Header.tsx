import Link from "next/link";

export default function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4 text-white mix-blend-difference sm:px-8 sm:py-6">
      <Link
        href="/"
        aria-label="Viduushi Paathak home"
        className="pointer-events-auto relative inline-flex items-center justify-center px-2 py-1 font-main font-medium text-3xl leading-none uppercase tracking-wide"
      >
        <span>VGP</span>
      </Link>

      <div className="flex items-center gap-2 text-sm uppercase tracking-wide sm:text-base">
        <span>Menu</span>
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full border border-current bg-transparent sm:size-3"
        />
      </div>
    </header>
  );
}

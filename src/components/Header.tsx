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

      <nav
        aria-label="Main navigation"
        className="pointer-events-auto flex items-center gap-4 text-sm uppercase tracking-wide sm:text-base"
      >
        <Link href="/">Work+</Link>
        <Link href="/about">About</Link>
      </nav>
    </header>
  );
}

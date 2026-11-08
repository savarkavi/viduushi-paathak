import { SiInstagram, SiX } from "react-icons/si";

export default function Footer() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between px-5 py-4 text-white mix-blend-difference sm:px-8 sm:py-6">
      <div
        className="flex items-center gap-4"
        role="group"
        aria-label="Social media"
      >
        <span role="img" aria-label="Instagram">
          <SiInstagram aria-hidden="true" className="size-4" />
        </span>
        <span role="img" aria-label="X (Twitter)">
          <SiX aria-hidden="true" className="size-3.5" />
        </span>
      </div>

      <small className="text-xs leading-none">©2026 Viduushi Paathak</small>
    </footer>
  );
}

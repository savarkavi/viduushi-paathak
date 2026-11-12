"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const WORK_CATEGORIES = [
  { label: "Fashion", href: "/fashion" },
  { label: "Editorial", href: "/editorial" },
  { label: "Advertising", href: "/advertising" },
  { label: "Personal", href: "/personal" },
];

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const workGroupRef = useRef<HTMLDivElement>(null);
  const workLinkRef = useRef<HTMLAnchorElement>(null);
  const workMenuRef = useRef<HTMLDivElement>(null);
  const plusIconRef = useRef<HTMLSpanElement>(null);
  const categoryLinksRef = useRef<HTMLAnchorElement[]>([]);
  const isMenuOpenRef = useRef(false);

  useGSAP(
    (_, contextSafe) => {
      const workGroup = workGroupRef.current;
      const workLink = workLinkRef.current;
      const menu = workMenuRef.current;
      const plusIcon = plusIconRef.current;
      const categoryLinks = categoryLinksRef.current;

      if (
        !workGroup ||
        !workLink ||
        !menu ||
        !plusIcon ||
        !categoryLinks.length
      ) {
        return;
      }

      gsap.set(menu, { autoAlpha: 0 });
      gsap.set(categoryLinks, { autoAlpha: 0, yPercent: -35 });
      gsap.set(plusIcon, { transformOrigin: "50% 50%" });
      const openWorkMenu = contextSafe?.(() => {
        if (isMenuOpenRef.current) {
          return;
        }

        isMenuOpenRef.current = true;
        workLink.setAttribute("aria-expanded", "true");
        gsap.killTweensOf([menu, plusIcon, ...categoryLinks]);
        gsap
          .timeline()
          .set(menu, { autoAlpha: 1 })
          .to(plusIcon, { rotation: 45, duration: 0.28, ease: "power3.out" }, 0)
          .to(
            categoryLinks,
            {
              autoAlpha: 1,
              yPercent: 0,
              duration: 0.38,
              ease: "power3.out",
              stagger: 0.055,
            },
            0.04,
          );
      });

      const closeWorkMenu = contextSafe?.(() => {
        if (!isMenuOpenRef.current) {
          return;
        }

        isMenuOpenRef.current = false;
        workLink.setAttribute("aria-expanded", "false");
        gsap.killTweensOf([menu, plusIcon, ...categoryLinks]);
        gsap
          .timeline()
          .to(plusIcon, { rotation: 0, duration: 0.22, ease: "power2.out" }, 0)
          .to(menu, { autoAlpha: 0, duration: 0.2, ease: "power2.out" }, 0)
          .set(categoryLinks, { filter: "blur(0px)", opacity: 1 });
      });

      const focusCategory = contextSafe?.((event: Event) => {
        const activeCategory = event.currentTarget as HTMLAnchorElement;
        const inactiveCategories = categoryLinks.filter(
          (category) => category !== activeCategory,
        );

        gsap.killTweensOf(categoryLinks);
        gsap.to(activeCategory, {
          filter: "blur(0px)",
          opacity: 1,
          duration: 0.2,
          ease: "power2.out",
        });
        gsap.to(inactiveCategories, {
          filter: "blur(3px)",
          opacity: 0.4,
          duration: 0.2,
          ease: "power2.out",
        });
      });

      const closeOnFocusExit = (event: FocusEvent) => {
        if (!workGroup.contains(event.relatedTarget as Node | null)) {
          closeWorkMenu?.();
        }
      };

      workGroup.addEventListener("pointerenter", openWorkMenu!);
      workGroup.addEventListener("pointerleave", closeWorkMenu!);
      workGroup.addEventListener("focusin", openWorkMenu!);
      workGroup.addEventListener("focusout", closeOnFocusExit);
      categoryLinks.forEach((category) => {
        category.addEventListener("pointerenter", focusCategory!);
        category.addEventListener("focus", focusCategory!);
      });

      return () => {
        workGroup.removeEventListener("pointerenter", openWorkMenu!);
        workGroup.removeEventListener("pointerleave", closeWorkMenu!);
        workGroup.removeEventListener("focusin", openWorkMenu!);
        workGroup.removeEventListener("focusout", closeOnFocusExit);
        categoryLinks.forEach((category) => {
          category.removeEventListener("pointerenter", focusCategory!);
          category.removeEventListener("focus", focusCategory!);
        });
      };
    },
    { scope: headerRef },
  );

  return (
    <header
      ref={headerRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4 text-white mix-blend-difference sm:px-8 sm:py-6"
    >
      <Link
        href="/"
        aria-label="Viduushi Paathak home"
        className="pointer-events-auto relative inline-flex items-center justify-center px-2 py-1 font-main font-medium text-3xl leading-none uppercase tracking-wide"
      >
        <span>VGP</span>
      </Link>

      <nav
        aria-label="Main navigation"
        className="pointer-events-auto flex items-center gap-8 text-sm uppercase tracking-wide sm:text-base"
      >
        <div ref={workGroupRef} className="relative">
          <Link
            ref={workLinkRef}
            href="/"
            aria-haspopup="true"
            aria-expanded="false"
            className="inline-flex items-center gap-1"
          >
            <span>Work</span>
            <span
              ref={plusIconRef}
              aria-hidden="true"
              className="relative inline-block size-3 will-change-transform"
            >
              <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
              <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
            </span>
          </Link>

          <div
            ref={workMenuRef}
            className="absolute top-full right-0 flex min-w-max flex-col items-end gap-1 pt-3"
            aria-label="Work categories"
          >
            {WORK_CATEGORIES.map(({ label, href }, index) => (
              <Link
                key={href}
                ref={(element) => {
                  if (element) {
                    categoryLinksRef.current[index] = element;
                  }
                }}
                href={href}
                className="will-change-transform"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <Link href="/about">About</Link>
      </nav>
    </header>
  );
}

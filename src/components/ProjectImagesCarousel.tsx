"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";

gsap.registerPlugin(useGSAP, Observer);

const IMAGES = Array.from(
  { length: 12 },
  (_, index) => `/test-images/test-img-${index + 1}.jpg`,
);

export const PROJECT_IMAGE_CARD = {
  minWidth: 14 * 16,
  viewportWidth: 0.31,
  maxWidth: 37 * 16,
  aspect: 3 / 4,
} as const;

export function projectImageCardWidth(viewportWidth: number) {
  return Math.min(
    PROJECT_IMAGE_CARD.maxWidth,
    Math.max(
      PROJECT_IMAGE_CARD.minWidth,
      viewportWidth * PROJECT_IMAGE_CARD.viewportWidth,
    ),
  );
}

type CardPosition = "left" | "center" | "right" | "leftExit" | "rightExit";

type ProjectImagesCarouselProps = {
  /** The project cover that should occupy the center card on mount. */
  initialImage?: string;
  /** Keeps the handoff dimensions aligned with the project cover. */
  initialAspect?: number;
  className?: string;
  background?: string;
};

const ProjectImagesCarousel = ({
  initialImage,
  initialAspect = PROJECT_IMAGE_CARD.aspect,
  className,
  background = "#ffffff",
}: ProjectImagesCarouselProps) => {
  const carouselRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const hasPlayedIntroRef = useRef(false);

  const images = useMemo(() => {
    if (!initialImage || IMAGES.includes(initialImage)) return IMAGES;
    return [initialImage, ...IMAGES];
  }, [initialImage]);

  useGSAP(
    (_, contextSafe) => {
      const cards = cardRefs.current.filter((card): card is HTMLDivElement =>
        Boolean(card),
      );

      if (cards.length !== images.length) {
        return;
      }

      const media = gsap.matchMedia();

      media.add(
        {
          all: "(min-width: 0px)",
          compact: "(max-width: 767px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (mediaContext) => {
          const isCompact = mediaContext.conditions?.compact;
          const reduceMotion = mediaContext.conditions?.reduceMotion;
          const duration = reduceMotion ? 0 : 0.85;
          const sideOffset = isCompact ? "50vw" : "35vw";
          const exitOffset = isCompact ? "86vw" : "68vw";
          let activeIndex = Math.max(0, images.indexOf(initialImage ?? ""));
          let isAnimating = false;

          const wrapIndex = (index: number) =>
            ((index % images.length) + images.length) % images.length;
          const cardAt = (index: number) => cards[wrapIndex(index)];

          const position = (slot: CardPosition) => {
            switch (slot) {
              case "left":
                return {
                  x: `-${sideOffset}`,
                  scale: 0.62,
                  rotationY: 42,
                  autoAlpha: 1,
                  zIndex: 1,
                };
              case "right":
                return {
                  x: sideOffset,
                  scale: 0.62,
                  rotationY: -42,
                  autoAlpha: 1,
                  zIndex: 1,
                };
              case "leftExit":
                return {
                  x: `-${exitOffset}`,
                  scale: 0.38,
                  rotationY: 58,
                  autoAlpha: 0,
                  zIndex: 0,
                };
              case "rightExit":
                return {
                  x: exitOffset,
                  scale: 0.38,
                  rotationY: -58,
                  autoAlpha: 0,
                  zIndex: 0,
                };
              default:
                return {
                  x: 0,
                  scale: 1,
                  rotationY: 0,
                  autoAlpha: 1,
                  zIndex: 2,
                };
            }
          };

          const setInitialPositions = () => {
            gsap.set(cards, position("leftExit"));
            gsap.set(cardAt(activeIndex - 1), position("left"));
            gsap.set(cardAt(activeIndex), position("center"));
            gsap.set(cardAt(activeIndex + 1), position("right"));
          };

          setInitialPositions();

          if (!hasPlayedIntroRef.current && !reduceMotion) {
            isAnimating = true;

            const left = cardAt(activeIndex - 1);
            const center = cardAt(activeIndex);
            const right = cardAt(activeIndex + 1);

            // Start scaled down and transparent in their respective slots
            gsap.set(center, { autoAlpha: 0, scale: 0.85 });
            gsap.set([left, right], { autoAlpha: 0, scale: 0.52 });

            gsap
              .timeline({
                defaults: { duration: 0.85, ease: "power3.out" },
                onComplete: () => {
                  hasPlayedIntroRef.current = true;
                  isAnimating = false;
                },
              })
              .to(center, { autoAlpha: 1, scale: 1 }, 0)
              .to([left, right], { autoAlpha: 1, scale: 0.62 }, 0);
          }

          const move = contextSafe!((direction: 1 | -1) => {
            if (isAnimating) {
              return;
            }

            isAnimating = true;

            const left = cardAt(activeIndex - 1);
            const center = cardAt(activeIndex);
            const right = cardAt(activeIndex + 1);
            const incoming = cardAt(
              direction === 1 ? activeIndex + 2 : activeIndex - 2,
            );

            const timeline = gsap.timeline({
              defaults: { duration, ease: "power3.inOut" },
              onComplete: () => {
                activeIndex = wrapIndex(activeIndex + direction);
                isAnimating = false;
              },
            });

            if (direction === 1) {
              timeline
                .set(incoming, position("rightExit"))
                .to(left, position("leftExit"), 0)
                .to(center, position("left"), 0)
                .to(right, position("center"), 0)
                .to(incoming, position("right"), 0);
            } else {
              timeline
                .set(incoming, position("leftExit"))
                .to(right, position("rightExit"), 0)
                .to(center, position("right"), 0)
                .to(left, position("center"), 0)
                .to(incoming, position("left"), 0);
            }
          });

          const observer = Observer.create({
            target: window,
            type: "wheel,touch,pointer",
            preventDefault: true,
            allowClicks: true,
            tolerance: 30,
            onDown: () => move(1),
            onUp: () => move(-1),
          });

          return () => observer.kill();
        },
      );

      return () => media.revert();
    },
    {
      dependencies: [images, initialImage],
      scope: carouselRef,
      revertOnUpdate: true,
    },
  );

  return (
    <section
      ref={carouselRef}
      className={[
        "relative isolate flex h-svh w-full items-center justify-center overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Project image carousel"
      style={{ perspective: "1600px", background }}
    >
      {images.map((source, index) => (
        <div
          key={source}
          ref={(element) => {
            if (element) {
              cardRefs.current[index] = element;
            }
          }}
          className="invisible absolute left-1/2 top-1/2 w-[clamp(14rem,31vw,37rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-neutral-200 opacity-0 shadow-[0_18px_40px_rgb(0_0_0/0.12)] will-change-transform"
          style={{
            aspectRatio: initialAspect,
            transformStyle: "preserve-3d",
          }}
        >
          <Image
            src={source}
            alt={`Project image ${index + 1}`}
            fill
            priority={source === initialImage || index < 3}
            sizes="(max-width: 767px) 65vw, 31vw"
            className="object-cover"
          />
        </div>
      ))}
    </section>
  );
};

export default ProjectImagesCarousel;

"use client";

import { useRef } from "react";
import Image from "next/image";
import { PiMouseScrollThin } from "react-icons/pi";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Observer } from "gsap/Observer";

gsap.registerPlugin(useGSAP, Observer);

type ImagesDialProps = {
  images: readonly string[];
  onImageAtTwelveChange?: (index: number) => void;
};

/**
 * Places one image at each hour position around a compact clock face.
 */
export default function ImagesDial({
  images,
  onImageAtTwelveChange,
}: ImagesDialProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const scrollIconRef = useRef<HTMLDivElement>(null);
  const imageFrameRefs = useRef<HTMLDivElement[]>([]);

  useGSAP(
    (_, contextSafe) => {
      const createContextSafe = contextSafe!;
      const orbit = orbitRef.current;
      const imageFrames = imageFrameRefs.current.filter(
        (frame): frame is HTMLDivElement => frame !== undefined,
      );

      if (!orbit || imageFrames.length === 0) {
        return;
      }

      const step = 360 / imageFrames.length;
      const media = gsap.matchMedia();

      media.add(
        {
          all: "(min-width: 0px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (mediaContext) => {
          const reduceMotion = mediaContext.conditions?.reduceMotion;
          const scrollIcon = scrollIconRef.current;
          let rotation = 0;
          let isAnimating = false;
          let hasSteppedThisGesture = false;

          if (scrollIcon && !reduceMotion) {
            gsap
              .timeline({ repeat: -1, repeatDelay: 0.16 })
              .fromTo(
                scrollIcon,
                { y: 0, autoAlpha: 0 },
                {
                  y: 1,
                  autoAlpha: 1,
                  duration: 0.12,
                  ease: "power1.out",
                },
              )
              .to(scrollIcon, { y: 12, duration: 0.78, ease: "none" })
              .to(
                scrollIcon,
                { autoAlpha: 0, duration: 0.18, ease: "power1.in" },
                0.78,
              );
          }

          const rotateOneStep = createContextSafe((direction: number) => {
            if (isAnimating || hasSteppedThisGesture) {
              return;
            }

            isAnimating = true;
            hasSteppedThisGesture = true;

            const targetRotation = rotation + direction * step;
            const overshoot = targetRotation + direction * 4;

            gsap
              .timeline({
                defaults: { duration: reduceMotion ? 0 : 0.34 },
                onComplete: () => {
                  rotation = targetRotation;
                  isAnimating = false;
                  const imageAtTwelveIndex =
                    ((-Math.round(rotation / step) % images.length) +
                      images.length) %
                    images.length;

                  onImageAtTwelveChange?.(imageAtTwelveIndex);
                },
              })
              .to(
                orbit,
                {
                  rotation: overshoot,
                  ease: "power2.out",
                },
                0,
              )
              .to(
                imageFrames,
                {
                  rotation: -overshoot,
                  ease: "power2.out",
                },
                0,
              )
              .to(orbit, {
                rotation: targetRotation,
                duration: reduceMotion ? 0 : 0.24,
                ease: "back.out(1.7)",
              })
              .to(
                imageFrames,
                {
                  rotation: -targetRotation,
                  duration: reduceMotion ? 0 : 0.24,
                  ease: "back.out(1.7)",
                },
                "<",
              );
          });

          const observer = Observer.create({
            target: window,
            type: "wheel,touch",
            tolerance: 28,
            onDown: () => rotateOneStep(1),
            onUp: () => rotateOneStep(-1),
            onStop: () => {
              hasSteppedThisGesture = false;
            },
            onStopDelay: 0.2,
          });

          return () => observer.kill();
        },
      );

      return () => media.revert();
    },
    { scope: dialRef },
  );

  return (
    <div
      ref={dialRef}
      className="pointer-events-none z-10 absolute bottom-0 left-1/2 h-(--dial-size) w-(--dial-size) -translate-x-1/2 translate-y-1/2"
      style={
        {
          "--dial-size": "clamp(15rem, 31vw, 28rem)",
          "--dial-radius":
            "calc(var(--dial-size) / 2 - var(--image-size) / 2 - 0.65rem)",
          "--image-size": "clamp(2.25rem, 4.4vw, 3.75rem)",
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div className="absolute inset-[0.35rem] rounded-full bg-[#171717]/15 shadow-[0_0_0_1px_rgb(23_23_23/0.18)] backdrop-blur-sm" />

      <div ref={orbitRef} className="absolute inset-0 will-change-transform">
        {images.map((source, index) => {
          const angle = index * (360 / images.length);

          return (
            <div
              key={source}
              className="absolute left-1/2 top-1/2 h-(--image-size) w-(--image-size)"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(-1 * var(--dial-radius))) rotate(-${angle}deg)`,
              }}
            >
              <div
                ref={(element) => {
                  if (element) {
                    imageFrameRefs.current[index] = element;
                  }
                }}
                className="relative h-full w-full will-change-transform"
              >
                <Image
                  src={source}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 36px, (max-width: 1024px) 48px, 60px"
                  className="rounded-full border border-[#deddda] object-cover shadow-md"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute left-1/2 top-[35%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-[#deddda]">
        <div className="relative h-7 w-4">
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#deddda]/50" />
          <div
            ref={scrollIconRef}
            className="absolute left-0 top-0.5 h-4 w-4 text-[#deddda]/85 will-change-transform"
          >
            <PiMouseScrollThin aria-hidden="true" className="h-full w-full" />
          </div>
        </div>
        <span className="mt-2.5 whitespace-nowrap text-[10px] leading-none font-bold uppercase tracking-[0.04em] text-[#deddda]/75">
          Scroll down
        </span>
      </div>
    </div>
  );
}

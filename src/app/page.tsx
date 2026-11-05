"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ImagesDial from "@/components/ImagesDial";
import LandingIntro from "@/components/LandingIntro";

gsap.registerPlugin(useGSAP);

const PORTFOLIO_IMAGES = Array.from(
  { length: 12 },
  (_, index) => `/test-images/test-img-${index + 1}.jpg`,
);

export default function Home() {
  const homeRef = useRef<HTMLElement>(null);
  const backgroundImageRefs = useRef<HTMLDivElement[]>([]);
  const [backgroundImage, setBackgroundImage] = useState({
    currentIndex: 0,
    previousIndex: 0,
  });

  const updateBackgroundImage = useCallback((index: number) => {
    setBackgroundImage((image) => {
      if (image.currentIndex === index) {
        return image;
      }

      return { currentIndex: index, previousIndex: image.currentIndex };
    });
  }, []);

  useGSAP(
    () => {
      const incomingBackground =
        backgroundImageRefs.current[backgroundImage.currentIndex];

      if (
        !incomingBackground ||
        backgroundImage.currentIndex === backgroundImage.previousIndex
      ) {
        return;
      }

      const media = gsap.matchMedia();

      media.add(
        {
          all: "(min-width: 0px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (mediaContext) => {
          gsap.fromTo(
            incomingBackground,
            {
              clipPath: "circle(0% at 50% 50%)",
              scale: 1.08,
            },
            {
              clipPath: "circle(100% at 50% 50%)",
              scale: 1,
              duration: mediaContext.conditions?.reduceMotion ? 0 : 1.2,
              ease: "power3.out",
            },
          );
        },
      );

      return () => media.revert();
    },
    {
      dependencies: [backgroundImage.currentIndex],
      revertOnUpdate: true,
      scope: homeRef,
    },
  );

  return (
    <main
      ref={homeRef}
      className="relative h-svh w-full overflow-hidden bg-[#171717]"
    >
      <LandingIntro />
      <div className="absolute inset-0" aria-label="Portfolio image collage">
        {PORTFOLIO_IMAGES.map((source, index) => {
          const isCurrent = index === backgroundImage.currentIndex;
          const isPrevious = index === backgroundImage.previousIndex;

          return (
            <div
              key={source}
              ref={(element) => {
                if (element) {
                  backgroundImageRefs.current[index] = element;
                }
              }}
              className="absolute inset-0"
              style={{
                visibility: isCurrent || isPrevious ? "visible" : "hidden",
                zIndex: isCurrent ? 2 : isPrevious ? 1 : 0,
                willChange: "clip-path, transform",
              }}
              aria-hidden={!isCurrent}
            >
              <Image
                src={source}
                alt={isCurrent ? "Selected portfolio image" : ""}
                fill
                preload={index === 0}
                sizes="100vw"
                className="object-cover object-top"
              />
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[#171717]/20" />
      <ImagesDial
        images={PORTFOLIO_IMAGES}
        onImageAtTwelveChange={updateBackgroundImage}
      />
    </main>
  );
}

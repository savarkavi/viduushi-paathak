"use client";

import { Fragment, useCallback, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ImagesDial from "@/components/ImagesDial";
import { PORTFOLIO_ITEMS } from "@/data/portfolio";
import IntroLanding from "@/components/IntroLanding";

gsap.registerPlugin(useGSAP);

const COPY_CHARACTER_STAGGER = 0.02;
const COPY_CHARACTER_DURATION = 0.5;

type AnimatedTextProps = {
  text: string;
  characterClassName: string;
};

function AnimatedText({ text, characterClassName }: AnimatedTextProps) {
  return text.split(" ").map((word, wordIndex, words) => (
    <Fragment key={`${word}-${wordIndex}`}>
      <span aria-hidden="true" className="inline-block">
        {word.split("").map((character, characterIndex) => (
          <span
            key={`${character}-${characterIndex}`}
            className={`${characterClassName} inline-block will-change-transform`}
          >
            {character}
          </span>
        ))}
      </span>
      {wordIndex < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

export default function Home() {
  const homeRef = useRef<HTMLElement>(null);
  const backgroundImageRefs = useRef<HTMLDivElement[]>([]);
  const centerCopyRef = useRef<HTMLDivElement>(null);
  const [backgroundImage, setBackgroundImage] = useState({
    currentIndex: 0,
    previousIndex: 0,
  });
  const currentPortfolioItem = PORTFOLIO_ITEMS[backgroundImage.currentIndex];

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
      const centerCopy = centerCopyRef.current;

      if (
        !incomingBackground ||
        !centerCopy ||
        backgroundImage.currentIndex === backgroundImage.previousIndex
      ) {
        return;
      }

      const titleCharacters = centerCopy.querySelectorAll<HTMLElement>(
        ".portfolio-title-char",
      );
      const categoryCharacters = centerCopy.querySelectorAll<HTMLElement>(
        ".portfolio-category-char",
      );

      const media = gsap.matchMedia();

      media.add(
        {
          all: "(min-width: 0px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (mediaContext) => {
          const duration = mediaContext.conditions?.reduceMotion ? 0 : 1.2;
          const copyDuration = mediaContext.conditions?.reduceMotion
            ? 0
            : COPY_CHARACTER_DURATION;
          const copyStagger = mediaContext.conditions?.reduceMotion
            ? 0
            : COPY_CHARACTER_STAGGER;

          gsap
            .timeline()
            .set(centerCopy, { autoAlpha: 0 })
            .fromTo(
              incomingBackground,
              {
                clipPath: "circle(0% at 50% 50%)",
                scale: 1.08,
              },
              {
                clipPath: "circle(100% at 50% 50%)",
                scale: 1,
                duration,
                ease: "power3.out",
              },
            )
            .addLabel("reveal-copy", "-=0.5")
            .set(centerCopy, { autoAlpha: 1 }, "reveal-copy")
            .fromTo(
              titleCharacters,
              { yPercent: 120 },
              {
                yPercent: 0,
                duration: copyDuration,
                ease: "power4.out",
                stagger: { each: copyStagger, from: "start" },
              },
              "reveal-copy",
            )
            .fromTo(
              categoryCharacters,
              { yPercent: 120 },
              {
                yPercent: 0,
                duration: copyDuration,
                ease: "power4.out",
                stagger: { each: copyStagger, from: "start" },
              },
              "reveal-copy",
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
      <IntroLanding />
      <div className="absolute inset-0" aria-label="Portfolio image collage">
        {PORTFOLIO_ITEMS.map(({ source, title }, index) => {
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
                alt={isCurrent ? title : ""}
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
      <div
        ref={centerCopyRef}
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center mix-blend-difference text-[#deddda]"
      >
        <div key={currentPortfolioItem.source}>
          <h1
            aria-label={currentPortfolioItem.title}
            className="font-main overflow-hidden text-5xl leading-none font-normal sm:text-7xl lg:text-9xl"
          >
            <AnimatedText
              text={currentPortfolioItem.title}
              characterClassName="portfolio-title-char"
            />
          </h1>
          <p
            aria-label={`In ${currentPortfolioItem.category}`}
            className="mt-3 overflow-hidden text-xs font-medium tracking-[0.2em] uppercase sm:text-sm"
          >
            <AnimatedText
              text={`In ${currentPortfolioItem.category}`}
              characterClassName="portfolio-category-char"
            />
          </p>
        </div>
      </div>
      <ImagesDial
        images={PORTFOLIO_ITEMS.map(({ source }) => source)}
        onImageAtTwelveChange={updateBackgroundImage}
      />
    </main>
  );
}

"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const INTRO_NAME = "Viduushi Paathak";
const INTRO_BIO =
  "Viduushi Guupta Paathak is a Fashion photographer drawn to expressive portraits, sculptural light, and the stories we tell through what we wear.";

const LINE_DURATION = 1;
const TITLE_CHARACTER_STAGGER = 0.03;
const BIO_CHARACTER_STAGGER = 0.005;
const TITLE_CHARACTER_COUNT = INTRO_NAME.replace(/\s/g, "").length;
const BIO_CHARACTER_COUNT = INTRO_BIO.replace(/\s/g, "").length;
const TITLE_CHARACTER_DURATION =
  LINE_DURATION - TITLE_CHARACTER_STAGGER * (TITLE_CHARACTER_COUNT - 1);
const BIO_CHARACTER_DURATION = Math.max(
  0.2,
  LINE_DURATION - BIO_CHARACTER_STAGGER * (BIO_CHARACTER_COUNT - 1),
);
const SPLIT_DURATION = 1;

function AnimatedCharacters({
  text,
  characterClassName,
  wordClassName = "",
}: {
  text: string;
  characterClassName: string;
  wordClassName?: string;
}) {
  const words = text.split(" ");

  return words.map((word, wordIndex) => (
    <Fragment key={`${word}-${wordIndex}`}>
      <span aria-hidden="true" className={`inline-block ${wordClassName}`}>
        {word.split("").map((character, characterIndex) => (
          <span
            key={`${character}-${characterIndex}`}
            className={`${characterClassName} invisible inline-block will-change-transform`}
          >
            {character}
          </span>
        ))}
      </span>
      {wordIndex < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

function waitForImage(image: HTMLImageElement) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      image
        .decode()
        .catch(() => undefined)
        .finally(resolve);
    };

    if (image.complete) {
      finish();
      return;
    }

    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });
}

export default function IntroLanding() {
  const containerRef = useRef<HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const landingImages = Array.from(
      document.querySelectorAll<HTMLImageElement>("main img"),
    );

    Promise.all(landingImages.map(waitForImage)).then(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useGSAP(
    () => {
      if (isLoading) {
        return;
      }

      const title =
        containerRef.current?.querySelector<HTMLElement>(".intro-title");
      const radius = title ? title.offsetHeight * 1.45 : 600;

      gsap.set([".intro-title", ".intro-bio"], {
        transformPerspective: 2500,
        transformOrigin: `50% 50% -${radius}px`,
        transformStyle: "preserve-3d",
      });
      gsap.set([".intro-title-char", ".intro-bio-char"], {
        visibility: "visible",
      });
      gsap.set(".intro-line", {
        scaleX: 0,
        transformOrigin: "left center",
      });

      const timeline = gsap.timeline();

      timeline
        .addLabel("text-reveal", 0)
        .from(
          ".intro-title-char",
          {
            yPercent: 120,
            duration: TITLE_CHARACTER_DURATION,
            ease: "power4.out",
            stagger: {
              each: TITLE_CHARACTER_STAGGER,
              from: "start",
            },
          },
          "text-reveal",
        )
        .from(
          ".intro-bio-char",
          {
            yPercent: 120,
            duration: BIO_CHARACTER_DURATION,
            ease: "power4.out",
            stagger: {
              each: BIO_CHARACTER_STAGGER,
              from: "start",
            },
          },
          "text-reveal",
        )
        .to(
          ".intro-line",
          {
            scaleX: 1,
            duration: 1.5,
            ease: "expo.inOut",
          },
          ">",
        )
        .to(
          [".intro-top-panel", ".intro-bottom-panel"],
          {
            backgroundColor: "#111",
            duration: 0.4,
          },
          ">",
        )
        .to(
          ".intro-section",
          {
            color: "#F5F0E8",
            duration: 0.4,
          },
          "<",
        )
        .to(
          ".intro-line",
          {
            backgroundColor: "rgba(245, 240, 232, 0.3)",
            duration: 0.4,
          },
          "<",
        );

      timeline
        .addLabel("split", ">")
        .to(
          ".intro-top-panel",
          {
            yPercent: -100,
            duration: SPLIT_DURATION,
            ease: "power3.inOut",
          },
          "split",
        )
        .to(
          ".intro-bottom-panel",
          {
            yPercent: 100,
            duration: SPLIT_DURATION,
            ease: "power3.inOut",
          },
          "split",
        )
        .to(
          ".intro-title",
          {
            rotationX: 45,
            duration: SPLIT_DURATION,
            ease: "power3.inOut",
          },
          "split",
        )
        .to(
          ".intro-bio",
          {
            rotationX: -45,
            duration: SPLIT_DURATION,
            ease: "power3.inOut",
          },
          "split",
        );
    },
    {
      dependencies: [isLoading],
      revertOnUpdate: true,
      scope: containerRef,
    },
  );

  return (
    <main ref={containerRef} className="relative z-50 w-full bg-[#F5F0E8]">
      <section
        className={`intro-section pointer-events-none fixed inset-0 z-20 overflow-hidden text-[#292824] ${
          isLoading ? "bg-[#F5F0E8]" : ""
        }`}
        aria-label="Site introduction"
      >
        {isLoading ? null : (
          <div aria-hidden="true" className="absolute inset-0">
            <div className="intro-top-panel absolute inset-x-0 top-0 flex h-1/2 min-w-0 items-end justify-center overflow-hidden bg-[#F5F0E8] will-change-transform">
              <p
                aria-label={INTRO_NAME}
                className="intro-title font-main font-bold m-0 mb-6 overflow-hidden px-2 text-center text-2xl leading-none whitespace-nowrap sm:text-8xl uppercase"
              >
                <AnimatedCharacters
                  text={INTRO_NAME}
                  characterClassName="intro-title-char"
                />
              </p>

              <div className="intro-line absolute inset-x-0 bottom-0 h-px bg-black/30" />
            </div>

            <div className="intro-bottom-panel absolute inset-x-0 bottom-0 flex h-1/2 min-w-0 items-start justify-center overflow-hidden bg-[#F5F0E8] will-change-transform">
              <p
                aria-label={INTRO_BIO}
                className="intro-bio font-serif mx-auto mt-6 max-w-md overflow-hidden px-6 text-center text-sm font-normal"
              >
                <AnimatedCharacters
                  text={INTRO_BIO}
                  characterClassName="intro-bio-char"
                  wordClassName="overflow-hidden"
                />
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

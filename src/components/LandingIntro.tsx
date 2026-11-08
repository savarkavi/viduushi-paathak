"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const TOP_TEXT = "Viduushi";
const BOTTOM_TEXT = "Paathak";

const REVEAL_DURATION = 1;
const CHARACTER_STAGGER = 0.05;
const CHARACTER_DURATION =
  REVEAL_DURATION -
  CHARACTER_STAGGER * (Math.max(TOP_TEXT.length, BOTTOM_TEXT.length) - 1);
const OUTLINE_DURATION = 0.3;

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

export default function LandingIntro() {
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

      const topWord =
        containerRef.current?.querySelector<HTMLElement>(".top-word");
      const radius = topWord ? topWord.offsetHeight * 1.45 : 600;

      gsap.set([".top-word", ".bottom-word"], {
        transformPerspective: 2500,
        transformOrigin: `50% 50% -${radius}px`,
        transformStyle: "preserve-3d",
      });
      gsap.set([".top-char", ".bottom-char"], { visibility: "visible" });
      gsap.set(".intro-line", {
        scaleX: 0,
        transformOrigin: "left center",
      });

      const timeline = gsap.timeline();

      timeline
        .addLabel("reveal", 0)
        .to(
          ".intro-line",
          {
            scaleX: 1,
            duration: REVEAL_DURATION,
            ease: "power3.inOut",
          },
          "reveal",
        )
        .from(".top-char", {
          yPercent: -120,
          duration: CHARACTER_DURATION,
          ease: "power4.out",
          stagger: {
            each: CHARACTER_STAGGER,
            from: "start",
          },
        })
        .from(
          ".bottom-char",
          {
            yPercent: 120,
            duration: CHARACTER_DURATION,
            ease: "power4.out",
            stagger: {
              each: CHARACTER_STAGGER,
              from: "end",
            },
          },
          "<",
        )
        .addLabel("outline", ">")
        .to(
          ".top-char",
          {
            color: "transparent",
            webkitTextStroke: "1px #4a4a4a",
            duration: OUTLINE_DURATION,
            ease: "power1.out",
            stagger: {
              each: CHARACTER_STAGGER,
              from: "start",
            },
          },
          "outline",
        )
        .to(
          ".bottom-char",
          {
            color: "transparent",
            webkitTextStroke: "1px #4a4a4a",
            duration: OUTLINE_DURATION,
            ease: "power1.out",
            stagger: {
              each: CHARACTER_STAGGER,
              from: "end",
            },
          },
          "outline",
        )
        .addLabel("split", ">")
        .to(
          ".intro-top-panel",
          {
            yPercent: -100,
            duration: 0.85,
            ease: "power3.inOut",
          },
          "split",
        )
        .to(
          ".intro-bottom-panel",
          {
            yPercent: 100,
            duration: 0.85,
            ease: "power3.inOut",
          },
          "split",
        )
        .to(
          ".top-word",
          {
            rotationX: 45,
            duration: 0.85,
            ease: "power3.inOut",
          },
          "split",
        )
        .to(
          ".bottom-word",
          {
            rotationX: -45,
            duration: 0.85,
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
    <main ref={containerRef} className="relative z-50 w-full bg-[#deddda]">
      <section
        className={`font-main pointer-events-none fixed inset-0 z-20 overflow-hidden text-[#292824] ${
          isLoading ? "bg-[#deddda]" : ""
        }`}
        aria-label="Site introduction"
      >
        {isLoading ? null : (
          <div aria-hidden="true" className="absolute inset-0">
            <div className="intro-top-panel absolute inset-x-0 top-0 flex h-1/2 min-w-0 items-end justify-center overflow-hidden bg-[#deddda] will-change-transform">
              <p
                aria-label={TOP_TEXT}
                className="m-0 mb-2 overflow-hidden px-6 whitespace-nowrap text-8xl sm:text-[10rem] lg:text-[16rem] xl:text-[19rem] 2xl:text-[26rem] leading-none font-normal uppercase"
              >
                <span className="top-word inline-block will-change-transform">
                  {TOP_TEXT.split("").map((char, index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className="top-char invisible inline-block will-change-transform"
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </p>

              <div
                aria-hidden="true"
                className="intro-line absolute inset-x-0 bottom-0 h-px bg-black/30"
              />
            </div>

            <div className="intro-bottom-panel absolute inset-x-0 bottom-0 flex h-1/2 min-w-0 items-start justify-center overflow-hidden bg-[#deddda] will-change-transform">
              <p
                aria-label={BOTTOM_TEXT}
                className="m-0 mt-2 overflow-hidden px-6 whitespace-nowrap text-8xl sm:text-[10rem] lg:text-[16rem] xl:text-[19rem] 2xl:text-[26rem] leading-none font-normal uppercase"
              >
                <span className="bottom-word inline-block will-change-transform">
                  {BOTTOM_TEXT.split("").map((char, index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className="bottom-char invisible inline-block will-change-transform"
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

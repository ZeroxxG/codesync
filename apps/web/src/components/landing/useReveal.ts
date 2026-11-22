import { useEffect, useRef, useState } from "react";

/**
 * Reveals an element once it scrolls into view.
 * Falls back to "visible" immediately when IntersectionObserver is unavailable.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (options?.once !== false) observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: options?.threshold ?? 0.15,
        rootMargin: options?.rootMargin ?? "0px 0px -8% 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin, options?.once]);

  return { ref, visible };
}

/** Adds the `js` class so reveal styles only apply when JS is running. */
export function useRevealBoot() {
  useEffect(() => {
    document.documentElement.classList.add("js");
  }, []);
}

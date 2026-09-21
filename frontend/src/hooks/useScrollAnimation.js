import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to trigger chart animations on scroll for responsive screens.
 * - Desktop/Laptop (>= 1024px): Activates immediately on mount so all charts render on initial load.
 * - Mobile/Tablet (< 1024px): Waits until user scrolls the chart into view before playing animation.
 */
export const useScrollAnimation = (breakpoint = 1024, threshold = 0.15) => {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    // Laptop/Desktop screen: Trigger immediately without waiting for scroll
    if (typeof window !== 'undefined' && window.innerWidth >= breakpoint) {
      setIsInView(true);
      return;
    }

    // Responsive screen: Observe scroll intersection
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [breakpoint, threshold]);

  return [ref, isInView];
};

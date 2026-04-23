import { useRef, useState } from 'react';

export function usePracticeScroll() {
  const scrollRef = useRef(null);
  const targetRef = useRef(0);
  const rafRef = useRef(null);
  
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateScrollState = (el) => {
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  const scrollTo = (el, targetPos) => {
    if (!el) return;
    
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    targetRef.current = Math.max(0, Math.min(targetPos, maxScrollLeft));

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    el.style.scrollSnapType = 'none';

    const startPos = el.scrollLeft;
    const change = targetRef.current - startPos;

    if (Math.abs(change) < 1) {
      el.scrollLeft = targetRef.current;
      el.style.scrollSnapType = '';
      return;
    }

    const duration = 600;
    const startTime = performance.now();

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out

      el.scrollLeft = startPos + change * ease;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateScroll);
      } else {
        el.scrollLeft = targetRef.current;
        el.style.scrollSnapType = '';
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animateScroll);
  };

  const handleScroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstChild = el.children[0];
    if (!firstChild) return;

    const cardWidth = firstChild.offsetWidth;
    const gap = 24;
    
    const currentTarget = targetRef.current || el.scrollLeft;
    const newTarget = currentTarget + (direction * (cardWidth + gap));

    scrollTo(el, newTarget);
  };

  return {
    scrollRef,
    canLeft,
    canRight,
    handleScroll,
    updateScrollState
  };
}

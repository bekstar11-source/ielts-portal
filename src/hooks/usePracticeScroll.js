import { useRef, useState, useCallback } from 'react';

export function usePracticeScroll() {
  const scrollRef = useRef(null);
  const isScrollingRef = useRef(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateScrollState = useCallback((el) => {
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const handleScroll = (direction) => {
    const el = scrollRef.current;
    if (!el || isScrollingRef.current) return;

    const firstChild = el.children[0];
    if (!firstChild) return;

    isScrollingRef.current = true;

    // Karta va gap masofasini aniq hisoblash
    const cardWidth = firstChild.offsetWidth;
    const style = window.getComputedStyle(el);
    const gap = parseInt(style.gap) || 24;
    const itemTotalWidth = cardWidth + gap;

    // Hozirgi indexni aniqlash
    const currentScroll = el.scrollLeft;
    const currentIndex = Math.round(currentScroll / itemTotalWidth);
    
    // Yangi target index
    const nextIndex = direction > 0 ? currentIndex + 1 : currentIndex - 1;
    const targetPos = nextIndex * itemTotalWidth;

    // Silliq skroll
    el.scrollTo({
      left: targetPos,
      behavior: 'smooth'
    });

    // Animatsiya tugaguncha kutish (duplicate clicks oldini olish)
    setTimeout(() => {
      isScrollingRef.current = false;
      updateScrollState(el);
    }, 500);
  };

  return {
    scrollRef,
    canLeft,
    canRight,
    handleScroll,
    updateScrollState
  };
}

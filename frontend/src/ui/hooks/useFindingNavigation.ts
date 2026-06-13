/**
 * Custom hook for navigating through findings with keyboard support.
 */
import { useState, useCallback } from 'react';
import { scrollToElement, nextIndex, prevIndex } from '../utils/navigation';

export function useFindingNavigation(totalFindings: number) {
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToFinding = useCallback((index: number) => {
    scrollToElement(`finding-${index}`, 'center');
  }, []);

  const goToNext = useCallback(() => {
    if (totalFindings === 0) return;
    const next = nextIndex(activeIndex, totalFindings);
    setActiveIndex(next);
    scrollToFinding(next);
  }, [activeIndex, totalFindings, scrollToFinding]);

  const goToPrevious = useCallback(() => {
    if (totalFindings === 0) return;
    const prev = prevIndex(activeIndex, totalFindings);
    setActiveIndex(prev);
    scrollToFinding(prev);
  }, [activeIndex, totalFindings, scrollToFinding]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < totalFindings) {
      setActiveIndex(index);
      scrollToFinding(index);
    }
  }, [totalFindings, scrollToFinding]);

  return {
    activeIndex,
    goToNext,
    goToPrevious,
    goToIndex,
    setActiveIndex,
  };
}

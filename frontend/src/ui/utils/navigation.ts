/**
 * Navigation utilities for scrolling and focus management.
 */

/**
 * Scroll to an element by ID with smooth behavior.
 *
 * @param elementId - DOM element ID to scroll to
 * @param block - Scroll alignment ('center', 'start', 'end', 'nearest')
 */
export function scrollToElement(
  elementId: string,
  block: ScrollLogicalPosition = 'center'
): void {
  const el = document.getElementById(elementId);
  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block,
    });
  }
}

/**
 * Calculate next index in circular navigation.
 *
 * @param current - Current index
 * @param total - Total number of items
 * @returns Next index (wraps to 0 at end)
 */
export function nextIndex(current: number, total: number): number {
  if (total === 0) return 0;
  return current + 1 >= total ? 0 : current + 1;
}

/**
 * Calculate previous index in circular navigation.
 *
 * @param current - Current index
 * @param total - Total number of items
 * @returns Previous index (wraps to end at start)
 */
export function prevIndex(current: number, total: number): number {
  if (total === 0) return 0;
  return current - 1 < 0 ? total - 1 : current - 1;
}

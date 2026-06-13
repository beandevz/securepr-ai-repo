/**
 * Word-level diff highlighting utilities.
 */

export interface WordToken {
  text: string;
  changed: boolean;
}

/**
 * Compute word-level diff between two text strings.
 *
 * Simple token-based diff that splits on whitespace.
 */
export function diffWords(
  oldText: string = '',
  newText: string = ''
): { left: WordToken[]; right: WordToken[] } {
  const oldTokens = oldText.split(/(\s+)/);
  const newTokens = newText.split(/(\s+)/);

  const maxLen = Math.max(oldTokens.length, newTokens.length);

  const left: WordToken[] = [];
  const right: WordToken[] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldTok = oldTokens[i] ?? '';
    const newTok = newTokens[i] ?? '';

    const changed = oldTok !== newTok;

    if (oldTok) {
      left.push({ text: oldTok, changed });
    }

    if (newTok) {
      right.push({ text: newTok, changed });
    }
  }

  return { left, right };
}

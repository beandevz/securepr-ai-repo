import { describe, it, expect, beforeEach } from 'vitest';
import { settings } from '../core/settings.js';
import { buildRagQueries } from './rag-query.js';

const PATCH = [
  '@@ -1,4 +1,6 @@',
  ' import { db } from "./db";',
  '-const q = "SELECT 1";',
  '+const q = "SELECT * FROM users WHERE name = " + name;',
  '+db.execute(q);',
  ' export default q;',
].join('\n');

describe('buildRagQueries', () => {
  beforeEach(() => {
    settings.ragQueryMaxChars = 4000;
  });

  it('queries on added lines only, dropping context and deletions', () => {
    const [query] = buildRagQueries('src/db.ts', PATCH);

    expect(query).toContain('const q = "SELECT * FROM users WHERE name = " + name;');
    expect(query).toContain('db.execute(q);');
    expect(query).not.toContain('const q = "SELECT 1"');
    expect(query).not.toContain('export default q;');
  });

  it('names the file and its language', () => {
    const [query] = buildRagQueries('src/db.ts', PATCH);

    expect(query).toContain('src/db.ts (TypeScript)');
  });

  it('adds security topics implied by the added code', () => {
    const [sqlQuery] = buildRagQueries('src/db.ts', PATCH);
    expect(sqlQuery).toContain('sql database query');

    const [authQuery] = buildRagQueries('src/auth.ts', '@@ -1 +1,2 @@\n+const jwt = sign(password);');
    expect(authQuery).toContain('authentication authorization access control');
    expect(authQuery).toContain('secret credential handling');
  });

  it('emits one query per file when the added code fits', () => {
    expect(buildRagQueries('src/db.ts', PATCH)).toHaveLength(1);
  });

  it('splits into per-hunk queries instead of truncating a large patch', () => {
    settings.ragQueryMaxChars = 60;
    const patch = [
      '@@ -1,2 +1,3 @@',
      `+const password = "${'a'.repeat(50)}";`,
      '@@ -20,2 +21,3 @@',
      `+fetch("http://internal/${'b'.repeat(50)}");`,
    ].join('\n');

    const queries = buildRagQueries('src/app.ts', patch);

    expect(queries.length).toBeGreaterThan(1);
    expect(queries.every(q => q.length <= 60)).toBe(true);
  });

  it('caps the number of queries per file', () => {
    settings.ragQueryMaxChars = 40;
    const patch = Array.from({ length: 10 }, (_, i) =>
      `@@ -${i},2 +${i},3 @@\n+const secret${i} = "${'x'.repeat(40)}";`
    ).join('\n');

    expect(buildRagQueries('src/app.ts', patch).length).toBeLessThanOrEqual(4);
  });

  it('falls back to the raw diff for deletion-only changes', () => {
    const patch = '@@ -1,3 +1,1 @@\n-const token = "abc";\n context';

    const [query] = buildRagQueries('src/app.py', patch);

    expect(query).toContain('src/app.py (Python)');
    expect(query).toContain('const token = "abc";');
  });
});

import { Finding } from '../types/finding';

export default function DiffViewer({
  patch,
  findings
}: {
  patch: string;
  findings: Finding[];
}) {
  const lines = patch.split('\n');

  let lineNumber = 1;

  function parseLine(line: string): 'add' | 'del' | 'context' {
    if (line.startsWith('+')) return 'add';
    if (line.startsWith('-')) return 'del';
    return 'context';
  }

  return (
    <div className="diff">
      {lines.map((line, i) => {
        const type = parseLine(line); // ✅ correct usage
        const hasFinding = findings.some(f => f.line === i + 1);
        return (
          <div key={i} className={`diff-line ${hasFinding ? 'has-finding' : ''}`}>
            <span className="ln">
              {lineNumber++}
            </span>

            <span className={`code ${type}`}>
              {line}
            </span>

            {/* ✅ annotations */}
            {hasFinding && findings
              ?.filter(f => f.line === i + 1)
              .map((f, idx) => (
                <div
                  key={idx}
                  className={`annotation ${f.severity.toLowerCase()}`}
                >
                  ⚠ {f.severity} - {f.title}

                  {f.rag_source && (
                    <div className="rag">
                      📖 {f.rag_source} ({f.rag_score?.toFixed(2)})
                    </div>
                  )}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
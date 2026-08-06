import { LlmAnalyzer } from './src/services/analyzers/llm-analyzer.ts';
import fs from 'fs';

const content = fs.readFileSync('../test-samples/java-sql-injection/src/main/java/com/securepr/testsamples/OrderService.java', 'utf-8');
const analyzer = new LlmAnalyzer('');
const findings = await analyzer.analyze('test-samples/java-sql-injection/src/main/java/com/securepr/testsamples/OrderService.java', content);
console.log('finding count:', findings.length);
findings.forEach((f: any, i: number) => console.log(i, '-', f.severity, f.title, '@ line', f.location.start_line));

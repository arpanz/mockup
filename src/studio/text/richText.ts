export interface RichRun {
  text: string;
  accent: boolean;
}

export type RichLine = RichRun[];

export function parseRichText(source: string): RichLine[] {
  const lines: RichLine[] = [[]];
  let buffer = '';
  let accented = false;
  let i = 0;
  const markers: number[] = [];

  for (let cursor = 0; cursor < source.length; cursor += 1) {
    if (source[cursor] === '\\' && source[cursor + 1] === '*') {
      cursor += 1;
      continue;
    }
    if (source[cursor] === '*') markers.push(cursor);
  }

  const paired = new Set<number>();
  for (let cursor = 0; cursor + 1 < markers.length; cursor += 2) {
    paired.add(markers[cursor]);
    paired.add(markers[cursor + 1]);
  }

  const push = () => {
    if (!buffer) return;
    const last = lines[lines.length - 1].at(-1);
    if (last?.accent === accented) last.text += buffer;
    else lines[lines.length - 1].push({ text: buffer, accent: accented });
    buffer = '';
  };

  while (i < source.length) {
    const char = source[i];
    if (char === '\\' && source[i + 1] === '*') {
      buffer += '*';
      i += 2;
      continue;
    }
    if (char === '*' && paired.has(i)) {
      push();
      accented = !accented;
      i += 1;
      continue;
    }
    if (char === '\n') {
      push();
      lines.push([]);
      i += 1;
      continue;
    }
    buffer += char;
    i += 1;
  }
  push();
  return lines;
}

export function toPlainText(source: string): string {
  return parseRichText(source)
    .map((line) => line.map((run) => run.text).join(''))
    .join('\n');
}

export function __richTextSelfTest(): string[] {
  const failures: string[] = [];
  const cases: Array<[string, string, Array<[string, boolean]>[]]> = [
    ['empty', '', [[]]],
    ['plain', 'Hello', [[['Hello', false]]]],
    ['only accent', '*wow*', [[['wow', true]]]],
    ['escaped', '\\*literal\\*', [[['*literal*', false]]]],
    ['unclosed', 'a *b', [[['a *b', false]]]],
    ['multiple lines', 'a\nb', [[['a', false]], [['b', false]]]],
    [
      'accent spanning words',
      'a *big idea* z',
      [[['a ', false], ['big idea', true], [' z', false]]],
    ],
    ['adjacent accents', '*a**b*', [[['ab', true]]]],
    ['empty line', 'a\n\nb', [[['a', false]], [], [['b', false]]]],
    ['literal slash', 'x\\y', [[['x\\y', false]]]],
    ['accent around newline', '*a\nb*', [[['a', true]], [['b', true]]]],
    ['escaped inside accent', '*a\\*b*', [[['a*b', true]]]],
  ];

  for (const [name, input, expected] of cases) {
    const actual = parseRichText(input).map((line) =>
      line.map(({ text, accent }) => [text, accent] as [string, boolean]),
    );
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`${name}: got ${JSON.stringify(actual)}`);
    }
  }
  return failures;
}

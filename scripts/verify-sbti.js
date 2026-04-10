const fs = require('fs');

const file = process.argv[2] || 'index.html';
const html = fs.readFileSync(file, 'utf8');

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractConst(name) {
  const start = html.indexOf(`const ${name} =`);
  expect(start >= 0, `Missing constant ${name}`);

  let i = html.indexOf('=', start) + 1;
  while (/\s/.test(html[i])) i += 1;

  const open = html[i];
  const close = open === '[' ? ']' : open === '{' ? '}' : null;
  expect(close, `Unsupported constant opener for ${name}: ${open}`);

  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  let end = i;

  for (; end < html.length; end += 1) {
    const ch = html[end];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }

  return eval(`(${html.slice(i, end)})`);
}

const requiredIds = [
  'intro',
  'test',
  'result',
  'startBtn',
  'submitBtn',
  'progressBar',
  'progressText',
  'questionList',
  'resultTitle',
  'resultSubtitle',
  'resultPrompt',
  'resultChineseName',
  'resultCodeName',
  'resultPosterImage',
  'resultMatchStats',
  'resultBody',
  'dimList',
  'resultQrImage',
  'resultQrLink',
  'restartBtn',
  'toTopBtn'
];

requiredIds.forEach((id) => {
  expect(html.includes(`id="${id}"`), `Missing #${id}`);
});

[
  'SBTI 权威人格解析',
  '你的人格类型是：',
  '扫码测测你的SBTI'
].forEach((marker) => {
  expect(html.includes(marker), `Missing marker: ${marker}`);
});

expect(!html.includes('author-box'), 'Old author accordion should be removed from the result screen');

const questions = extractConst('questions');
const specialQuestions = extractConst('specialQuestions');
const typeLibrary = extractConst('TYPE_LIBRARY');
const normalTypes = extractConst('NORMAL_TYPES');
const typeImages = extractConst('TYPE_IMAGES');
const dimensionMeta = extractConst('dimensionMeta');

expect(questions.length === 30, `Expected 30 questions, got ${questions.length}`);
expect(specialQuestions.length === 2, `Expected 2 special questions, got ${specialQuestions.length}`);
expect(Object.keys(dimensionMeta).length === 15, `Expected 15 dimensions, got ${Object.keys(dimensionMeta).length}`);
expect(normalTypes.length === 25, `Expected 25 normal types, got ${normalTypes.length}`);
expect(Object.keys(typeLibrary).length === 27, `Expected 27 total types, got ${Object.keys(typeLibrary).length}`);
expect(Object.keys(typeImages).length === 27, `Expected 27 type images, got ${Object.keys(typeImages).length}`);

expect(
  html.includes("const RESULT_QR_URL = 'https://sbti.traeai.com';"),
  'Missing fixed RESULT_QR_URL constant'
);

expect(html.includes('data:image/png;base64,'), 'Missing embedded QR image');

function sumToLevel(score) {
  if (score <= 3) return 'L';
  if (score === 4) return 'M';
  return 'H';
}

function levelNum(level) {
  return { L: 1, M: 2, H: 3 }[level];
}

function parsePattern(pattern) {
  return pattern.replace(/-/g, '').split('');
}

function computeResult(answers) {
  const rawScores = {};
  const levels = {};

  Object.keys(dimensionMeta).forEach((dim) => {
    rawScores[dim] = 0;
  });

  questions.forEach((q) => {
    rawScores[q.dim] += Number(answers[q.id] || 0);
  });

  Object.entries(rawScores).forEach(([dim, score]) => {
    levels[dim] = sumToLevel(score);
  });

  const dimensionOrder = Object.keys(dimensionMeta);
  const userVector = dimensionOrder.map((dim) => levelNum(levels[dim]));

  const ranked = normalTypes
    .map((type) => {
      const vector = parsePattern(type.pattern).map(levelNum);
      let distance = 0;
      let exact = 0;

      for (let i = 0; i < vector.length; i += 1) {
        const diff = Math.abs(userVector[i] - vector[i]);
        distance += diff;
        if (diff === 0) exact += 1;
      }

      const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));

      return {
        ...type,
        ...typeLibrary[type.code],
        distance,
        exact,
        similarity
      };
    })
    .sort((a, b) => a.distance - b.distance || b.exact - a.exact || b.similarity - a.similarity);

  const bestNormal = ranked[0];

  if (answers.drink_gate_q2 === 2) {
    return typeLibrary.DRUNK.code;
  }

  if (bestNormal.similarity < 60) {
    return typeLibrary.HHHH.code;
  }

  return bestNormal.code;
}

function uniformAnswers(value) {
  return Object.fromEntries(questions.map((q) => [q.id, value]));
}

const fixtures = [
  {
    name: 'regularOjbk',
    answers: { ...uniformAnswers(2), drink_gate_q1: 1 },
    expected: 'OJBK'
  },
  {
    name: 'hiddenDrunk',
    answers: { ...uniformAnswers(2), drink_gate_q1: 3, drink_gate_q2: 2 },
    expected: 'DRUNK'
  },
  {
    name: 'fallbackHhhh',
    answers: {
      q1: 2, q2: 1, q3: 1, q4: 2, q5: 2, q6: 1, q7: 3, q8: 2, q9: 1, q10: 2,
      q11: 1, q12: 2, q13: 2, q14: 2, q15: 3, q16: 3, q17: 2, q18: 3, q19: 3, q20: 3,
      q21: 2, q22: 3, q23: 2, q24: 1, q25: 3, q26: 3, q27: 1, q28: 1, q29: 1, q30: 1,
      drink_gate_q1: 1
    },
    expected: 'HHHH'
  }
];

fixtures.forEach(({ name, answers, expected }) => {
  const actual = computeResult(answers);
  expect(actual === expected, `${name} expected ${expected}, got ${actual}`);
});

expect(html.includes('window.__SBTI_FIXTURES__ = {'), 'Missing debug fixtures');
expect(html.includes('window.__SBTI_DEBUG__ = {'), 'Missing debug helper');

[
  'regularOjbk',
  'hiddenDrunk',
  'fallbackHhhh'
].forEach((fixtureName) => {
  expect(html.includes(`${fixtureName}:`), `Missing fixture ${fixtureName}`);
});

expect(!html.includes('分流1'), 'Diversion link 1 should be removed');
expect(!html.includes('分流2'), 'Diversion link 2 should be removed');
expect(!html.includes('分流3'), 'Diversion link 3 should be removed');

[
  'author-box',
  'posterCaption',
  'funNote',
  'matchBadge',
  'resultModeKicker'
].forEach((staleMarker) => {
  expect(!html.includes(staleMarker), `Stale result marker still present: ${staleMarker}`);
});

console.log(`PASS baseline checks for ${file}`);

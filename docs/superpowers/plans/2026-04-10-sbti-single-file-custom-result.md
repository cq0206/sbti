# SBTI Single-File Custom Result Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/Users/qian.cheng1/Documents/project/sbti/index.html` as a local single-file SBTI app that keeps the original homepage and questionnaire logic intact, replaces the result screen with the user-provided mobile card layout, and embeds an offline QR for `https://sbti.traeai.com`.

**Architecture:** Start from `/Users/qian.cheng1/Documents/project/sbti/target.html` as the source-of-truth for question data, type data, images, and scoring. Copy it into `/Users/qian.cheng1/Documents/project/sbti/index.html`, then surgically replace the homepage diversion markup and the full result-screen HTML/CSS/JS while leaving the underlying scoring algorithm unchanged. Use one no-dependency Node verifier to enforce structure, data counts, fixed QR configuration, and three deterministic result fixtures.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node.js built-ins, `curl`, Perl one-liners

---

## File Map

- Create: `index.html`
  - Final runtime artifact. One file containing HTML, CSS, JavaScript, SBTI data, embedded result images, and embedded QR image.
- Create: `scripts/verify-sbti.js`
  - No-dependency verifier. Reads `index.html`, extracts inline constants, validates DOM markers, validates QR configuration, and re-runs the scoring algorithm against known fixtures.
- Reference only: `target.html`
  - Baseline source for original homepage/test screen structure, data, and scoring logic.
- Reference only: `docs/superpowers/specs/2026-04-10-sbti-single-file-replica-design.md`
  - Approved spec.
- Reference only: `/Users/qian.cheng1/Library/Application Support/LarkShell/sdk_storage/f1482d7823dbbf1ddab613bd5f866981/resources/images/img_v3_0210k_9154af62-247c-42f7-af96-089075ac7dfg.jpg`
  - Visual reference for the customized result screen.

## Workspace Note

- This workspace is not currently a Git repository (`git rev-parse` returns `no-git-repo`).
- Replace normal commit steps with local checkpoints while executing this plan.
- If Git is initialized before implementation begins, add commits after each task without changing task order.

### Task 1: Bootstrap the Single-File Artifact and Baseline Verifier

**Files:**
- Create: `scripts/verify-sbti.js`
- Create: `index.html`

- [ ] **Step 1: Write the failing baseline verifier**

Create `scripts/verify-sbti.js` with this exact content:

```js
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

[
  'intro',
  'test',
  'result',
  'startBtn',
  'submitBtn',
  'progressBar',
  'progressText',
  'questionList'
].forEach((id) => {
  expect(html.includes(`id="${id}"`), `Missing #${id}`);
});

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

console.log(`PASS baseline checks for ${file}`);
```

- [ ] **Step 2: Run the verifier and confirm it fails before `index.html` exists**

Run:

```bash
node scripts/verify-sbti.js
```

Expected: FAIL with an `ENOENT` error for missing `index.html`.

- [ ] **Step 3: Create the baseline runtime file by copying the source-of-truth page**

Run:

```bash
mkdir -p scripts
cp target.html index.html
```

- [ ] **Step 4: Run the verifier again and confirm the baseline copy passes**

Run:

```bash
node scripts/verify-sbti.js
```

Expected:

```text
PASS baseline checks for index.html
```

- [ ] **Step 5: Record a local checkpoint**

Run:

```bash
ls -lh index.html scripts/verify-sbti.js
```

Expected: both files exist and `index.html` is the large single-file artifact copied from `target.html`.

### Task 2: Replace the Result Screen Markup and Styles

**Files:**
- Modify: `scripts/verify-sbti.js`
- Modify: `index.html`

- [ ] **Step 1: Extend the verifier so the old result layout fails**

In `scripts/verify-sbti.js`, replace the baseline ID check block with this exact block:

```js
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
```

- [ ] **Step 2: Run the verifier and confirm the copied baseline fails**

Run:

```bash
node scripts/verify-sbti.js
```

Expected: FAIL on a missing new result element such as `#resultTitle`.

- [ ] **Step 3: Replace the old result section and add the new card-layout styles**

In `index.html`, delete the old result-screen CSS rules for selectors like `.result-hero`, `.type-box`, `.analysis-box`, `.note-box`, `.author-box`, `.poster-caption`, and replace them with this exact CSS block:

```css
.result-wrap.card {
  max-width: 420px;
  margin: 0 auto;
  padding: 20px 16px 24px;
  border: 0;
  box-shadow: none;
  background:
    radial-gradient(circle at top, rgba(255,255,255,0.95), rgba(245,241,234,0.96) 72%),
    linear-gradient(180deg, #f5f2ec 0%, #efe8de 100%);
}

.result-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-header {
  text-align: center;
  padding-top: 4px;
}

.result-header h2,
.result-header p,
.result-card h3,
.result-card p {
  margin: 0;
}

.result-title {
  font-size: 28px;
  line-height: 1.15;
  letter-spacing: -0.04em;
  color: #2f2a24;
  font-weight: 800;
}

.result-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #9f9588;
}

.result-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  padding: 18px 18px 20px;
  box-shadow: 0 10px 32px rgba(76, 58, 37, 0.08);
}

.result-type-card {
  text-align: center;
}

.result-prompt {
  font-size: 14px;
  color: #8e8579;
}

.result-cn {
  margin-top: 10px;
  font-size: 40px;
  line-height: 1.08;
  color: #26221c;
  font-weight: 900;
}

.result-code {
  margin-top: 6px;
  font-size: 28px;
  line-height: 1.1;
  color: #5ca148;
  font-weight: 900;
}

.result-poster {
  margin-top: 18px;
  display: flex;
  justify-content: center;
}

.result-poster-image {
  width: min(100%, 220px);
  height: auto;
  display: block;
}

.result-match {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 999px;
  background: #eef5ff;
  color: #4f77bf;
  font-size: 12px;
  font-weight: 700;
}

.result-body {
  font-size: 14px;
  line-height: 1.9;
  color: #4b4339;
  white-space: pre-wrap;
}

.metric-list {
  display: grid;
  gap: 14px;
  margin-top: 12px;
}

.metric-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.metric-title {
  font-size: 14px;
  font-weight: 800;
  color: #2d2923;
}

.metric-detail {
  margin-top: 6px;
  font-size: 12px;
  color: #8e8579;
}

.metric-value {
  font-size: 16px;
  font-weight: 900;
}

.result-qr-card {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 16px;
}

.result-qr-copy h3 {
  font-size: 18px;
  color: #2d2923;
  font-weight: 800;
}

.result-qr-copy p {
  margin-top: 8px;
  font-size: 12px;
  color: #8e8579;
  line-height: 1.7;
}

.result-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  color: #b8ad9f;
  text-decoration: none;
}

.result-qr-image {
  width: 92px;
  height: 92px;
  display: block;
  border-radius: 10px;
}

.result-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .result-wrap.card {
    max-width: none;
    padding: 16px 12px 20px;
  }

  .result-cn {
    font-size: 34px;
  }

  .result-code {
    font-size: 24px;
  }
}
```

Then replace the entire old `<section id="result" class="screen">...</section>` block with this exact block:

```html
<section id="result" class="screen">
  <div class="result-wrap card">
    <div class="result-page">
      <header class="result-header">
        <h2 id="resultTitle" class="result-title">SBTI 权威人格解析</h2>
        <p id="resultSubtitle" class="result-subtitle">爱聊更要聊真的自我</p>
      </header>

      <section class="result-card result-type-card">
        <p id="resultPrompt" class="result-prompt">你的人格类型是：</p>
        <h3 id="resultChineseName" class="result-cn">无所谓人</h3>
        <p id="resultCodeName" class="result-code">OJBK</p>

        <div class="result-poster">
          <img id="resultPosterImage" class="result-poster-image" alt="人格结果图">
        </div>

        <div id="resultMatchStats" class="result-match">匹配度 70% · 精准命中 7/15 维</div>
      </section>

      <section class="result-card">
        <p id="resultBody" class="result-body"></p>
      </section>

      <section class="result-card">
        <h3>十五维度结构分析</h3>
        <div id="dimList" class="metric-list"></div>
      </section>

      <section class="result-card result-qr-card">
        <div class="result-qr-copy">
          <h3>扫码测测你的SBTI</h3>
          <p>探索更全面、带梗的人格镜像</p>
          <a
            id="resultQrLink"
            class="result-link"
            href="https://sbti.traeai.com"
            target="_blank"
            rel="noreferrer"
          >sbti.traeai.com</a>
        </div>
        <img id="resultQrImage" class="result-qr-image" alt="SBTI 二维码">
      </section>

      <div class="result-actions">
        <button id="restartBtn" class="btn-secondary">重新测试</button>
        <button id="toTopBtn" class="btn-primary">回到首页</button>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Run the verifier and confirm the new result skeleton passes**

Run:

```bash
node scripts/verify-sbti.js
```

Expected:

```text
PASS baseline checks for index.html
```

### Task 3: Rewire the Result Renderer and Embed the Offline QR

**Files:**
- Modify: `scripts/verify-sbti.js`
- Modify: `index.html`

- [ ] **Step 1: Extend the verifier to require fixed QR config and deterministic result fixtures**

Append this exact block to the bottom of `scripts/verify-sbti.js`, just before the final `console.log(...)`:

```js
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
```

- [ ] **Step 2: Run the verifier and confirm it fails before the new JS exists**

Run:

```bash
node scripts/verify-sbti.js
```

Expected: FAIL on `Missing fixed RESULT_QR_URL constant`.

- [ ] **Step 3: Add the new result-page constants, grouped-dimension renderer, and embed the QR**

In `index.html`, add these constants near the top of the runtime script, immediately after `const dimensionMeta = ...`:

```js
const RESULT_PAGE_TITLE = 'SBTI 权威人格解析';
const RESULT_PAGE_SUBTITLE = '爱聊更要聊真的自我';
const RESULT_PAGE_PROMPT = '你的人格类型是：';
const RESULT_QR_URL = 'https://sbti.traeai.com';

const MODEL_GROUPS = [
  { title: '自我模型', dims: ['S1', 'S2', 'S3'], color: '#6e63ff' },
  { title: '情感模型', dims: ['E1', 'E2', 'E3'], color: '#f2778f' },
  { title: '态度模型', dims: ['A1', 'A2', 'A3'], color: '#35b87d' },
  { title: '行动驱力', dims: ['Ac1', 'Ac2', 'Ac3'], color: '#d49b32' },
  { title: '社交模型', dims: ['So1', 'So2', 'So3'], color: '#7c5cff' }
];
```

Then replace the old `renderDimList` and `renderResult` functions with these exact functions:

```js
function getGroupPercent(result, dims) {
  const total = dims.reduce((sum, dim) => sum + result.rawScores[dim], 0);
  const min = dims.length * 2;
  const max = dims.length * 6;
  return Math.round(((total - min) / (max - min)) * 100);
}

function renderDimList(result) {
  const dimList = document.getElementById('dimList');
  dimList.innerHTML = MODEL_GROUPS.map((group) => {
    const detail = group.dims.map((dim) => `${dim}: ${result.levels[dim]}`).join('   ');
    const percent = getGroupPercent(result, group.dims);

    return `
      <div class="metric-row">
        <div>
          <div class="metric-title">${group.title}</div>
          <div class="metric-detail">${detail}</div>
        </div>
        <div class="metric-value" style="color:${group.color}">${percent}%</div>
      </div>
    `;
  }).join('');
}

function renderResult() {
  const result = computeResult();
  const type = result.finalType;

  document.getElementById('resultTitle').textContent = RESULT_PAGE_TITLE;
  document.getElementById('resultSubtitle').textContent = RESULT_PAGE_SUBTITLE;
  document.getElementById('resultPrompt').textContent = RESULT_PAGE_PROMPT;
  document.getElementById('resultChineseName').textContent = type.cn;
  document.getElementById('resultCodeName').textContent = type.code;
  document.getElementById('resultMatchStats').textContent =
    `匹配度 ${result.bestNormal.similarity}% · 精准命中 ${result.bestNormal.exact}/15 维`;
  document.getElementById('resultBody').textContent = type.desc;

  const posterImage = document.getElementById('resultPosterImage');
  const imageSrc = TYPE_IMAGES[type.code];

  if (imageSrc) {
    posterImage.src = imageSrc;
    posterImage.alt = `${type.code}（${type.cn}）`;
    posterImage.hidden = false;
  } else {
    posterImage.removeAttribute('src');
    posterImage.alt = '';
    posterImage.hidden = true;
  }

  const qrImage = document.getElementById('resultQrImage');
  qrImage.src = RESULT_QR_IMAGE;
  qrImage.alt = `${RESULT_QR_URL} 二维码`;

  const qrLink = document.getElementById('resultQrLink');
  qrLink.href = RESULT_QR_URL;
  qrLink.textContent = RESULT_QR_URL.replace(/^https?:\/\//, '');

  renderDimList(result);
  showScreen('result');
}
```

Now generate the QR once, convert it to base64, and inject it into `index.html`:

```bash
curl -L "https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=https%3A%2F%2Fsbti.traeai.com" -o /tmp/sbti-qr.png
QR_BASE64="$(base64 < /tmp/sbti-qr.png | tr -d '\n')"
perl -0pi -e "s#const RESULT_QR_URL = 'https://sbti.traeai.com';#const RESULT_QR_URL = 'https://sbti.traeai.com';\\nconst RESULT_QR_IMAGE = 'data:image/png;base64,$QR_BASE64';#g" index.html
```

- [ ] **Step 4: Run the verifier and confirm QR/data/fixture checks pass**

Run:

```bash
node scripts/verify-sbti.js
```

Expected:

```text
PASS baseline checks for index.html
```

- [ ] **Step 5: Record a local checkpoint**

Run:

```bash
rg -n "RESULT_QR_URL|RESULT_QR_IMAGE|MODEL_GROUPS" index.html
```

Expected: all three markers are present exactly once in the runtime script.

### Task 4: Add Deterministic Debug Fixtures for Manual QA

**Files:**
- Modify: `scripts/verify-sbti.js`
- Modify: `index.html`

- [ ] **Step 1: Extend the verifier so fixture helpers are required**

Append this exact block to `scripts/verify-sbti.js`, still before the final `console.log(...)`:

```js
expect(html.includes('window.__SBTI_FIXTURES__ = {'), 'Missing debug fixtures');
expect(html.includes('window.__SBTI_DEBUG__ = {'), 'Missing debug helper');

[
  'regularOjbk',
  'hiddenDrunk',
  'fallbackHhhh'
].forEach((fixtureName) => {
  expect(html.includes(`${fixtureName}:`), `Missing fixture ${fixtureName}`);
});
```

- [ ] **Step 2: Run the verifier and confirm it fails before the helper exists**

Run:

```bash
node scripts/verify-sbti.js
```

Expected: FAIL on `Missing debug fixtures`.

- [ ] **Step 3: Add the fixture helper into `index.html`**

In `index.html`, add this exact block after `renderResult()` and before the event listeners:

```js
function buildUniformAnswers(value) {
  return Object.fromEntries(questions.map((q) => [q.id, value]));
}

window.__SBTI_FIXTURES__ = {
  regularOjbk: {
    ...buildUniformAnswers(2),
    drink_gate_q1: 1
  },
  hiddenDrunk: {
    ...buildUniformAnswers(2),
    drink_gate_q1: 3,
    drink_gate_q2: 2
  },
  fallbackHhhh: {
    q1: 2, q2: 1, q3: 1, q4: 2, q5: 2, q6: 1, q7: 3, q8: 2, q9: 1, q10: 2,
    q11: 1, q12: 2, q13: 2, q14: 2, q15: 3, q16: 3, q17: 2, q18: 3, q19: 3, q20: 3,
    q21: 2, q22: 3, q23: 2, q24: 1, q25: 3, q26: 3, q27: 1, q28: 1, q29: 1, q30: 1,
    drink_gate_q1: 1
  }
};

window.__SBTI_DEBUG__ = {
  loadFixture(name) {
    const fixture = window.__SBTI_FIXTURES__[name];

    if (!fixture) {
      throw new Error(`Unknown fixture: ${name}`);
    }

    app.previewMode = false;
    app.answers = { ...fixture };
    app.shuffledQuestions = [...questions, specialQuestions[0]];
    renderQuestions();
    renderResult();
  }
};
```

- [ ] **Step 4: Run the verifier and confirm the helper is discoverable**

Run:

```bash
node scripts/verify-sbti.js
```

Expected:

```text
PASS baseline checks for index.html
```

### Task 5: Fix the Homepage Diversion Links and Run Final Regression

**Files:**
- Modify: `scripts/verify-sbti.js`
- Modify: `index.html`

- [ ] **Step 1: Extend the verifier to require three standalone diversion links and no stale result markers**

Append this exact block to `scripts/verify-sbti.js`, again before the final `console.log(...)`:

```js
const introActionBlocks = html.match(/<div class="hero-actions hero-actions-single">[\s\S]*?<\/div>/g) || [];
const diversionBlock = introActionBlocks[1] || '';
const diversionLinks = [
  ...diversionBlock.matchAll(/<a href="([^"]+)" target="_blank">\s*<button>(分流[123])<\/button>\s*<\/a>/g)
];

expect(diversionLinks.length === 3, `Expected 3 standalone diversion links, got ${diversionLinks.length}`);

[
  'author-box',
  'posterCaption',
  'funNote',
  'matchBadge',
  'resultModeKicker'
].forEach((staleMarker) => {
  expect(!html.includes(staleMarker), `Stale result marker still present: ${staleMarker}`);
});
```

- [ ] **Step 2: Run the verifier and confirm the old homepage markup fails**

Run:

```bash
node scripts/verify-sbti.js
```

Expected: FAIL on `Expected 3 standalone diversion links, got 2`.

- [ ] **Step 3: Replace the nested homepage anchors and remove stale result references**

In `index.html`, replace the broken homepage diversion block with this exact HTML:

```html
<div class="hero-actions hero-actions-single">
  <a href="http://m1590843.abc.818222.xyz" target="_blank">
    <button>分流1</button>
  </a>
  <a href="https://sbti.unun.dev/" target="_blank">
    <button>分流2</button>
  </a>
  <a href="https://sbti.enjoyow.com" target="_blank">
    <button>分流3</button>
  </a>
</div>
```

Then remove any leftover runtime references to the deleted old result elements. This exact command should return no matches when you are done:

```bash
rg -n "author-box|posterCaption|funNote|matchBadge|resultModeKicker" index.html
```

Expected: no output.

- [ ] **Step 4: Run the full automated verifier and then execute the three manual QA fixtures**

Run:

```bash
node scripts/verify-sbti.js
open index.html
```

Expected automated output:

```text
PASS baseline checks for index.html
```

In the browser console, run these exact commands one by one:

```js
window.__SBTI_DEBUG__.loadFixture('regularOjbk')
window.__SBTI_DEBUG__.loadFixture('hiddenDrunk')
window.__SBTI_DEBUG__.loadFixture('fallbackHhhh')
```

Expected browser results:

- `regularOjbk` shows `无所谓人 / OJBK`
- `hiddenDrunk` shows `酒鬼 / DRUNK`
- `fallbackHhhh` shows `傻乐者 / HHHH`
- All three fixtures use the new card-style result page
- The QR card remains visible and the link target is `https://sbti.traeai.com`

- [ ] **Step 5: Record the final local checkpoint**

Run:

```bash
ls -lh index.html scripts/verify-sbti.js
```

Expected: final `index.html` and verifier script are present and ready for handoff.

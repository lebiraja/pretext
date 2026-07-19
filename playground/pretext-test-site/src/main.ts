import { layout, layoutWithLines, prepareWithSegments } from '@chenglou/pretext';
import './style.css';

const sampleText = `AGI 春天到了. بدأت الرحلة 🚀

The Pretext Engine: A Revolution in Text Measurement

Text layout is one of the web's oldest problems. For decades, developers have relied on the DOM to measure text, triggering expensive layout reflows. Today, we unlock a new path: pure arithmetic text measurement powered by canvas-native font engines.

This newspaper celebrates a breakthrough in multiline text measurement that sidesteps layout reflow entirely. Fast, accurate, and language-agnostic, Pretext measures text for any script—Arabic, Chinese, Thai, Urdu, emoji, and mixed-script paragraphs—without touching the DOM.

Move your cursor around this page. Watch the dragon glide through the columns. The layout breathes with your motion. This is interactive typography without compromise.

شعرٌ وحكمةٌ في النص المتدفق. العربية الحديثة تجد طريقها عبر الأعمدة. لا حدود للغات المدعومة، من اليمين إلى اليسار في تناغم تام.

東京の朝は新しい始まり。漢字、ひらがな、カタカナ。Pretextはすべての言語を理解する。改行はもう悩みの種ではない。

The dragon is more than decoration. It represents the fluid, adaptive nature of modern text rendering. Each word flows around it. Each line breaks intelligently. The measurement is exact, the animation is smooth, and the experience feels alive.

Experiment. Move slowly, move quickly. Watch the columns compress and expand. See the line counts shift. This is the future of text layout on the web.`;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App root not found');
}

app.innerHTML = `
  <div class="newspaper">
    <header class="masthead">
      <h1>THE PRETEXT GAZETTE</h1>
      <p class="tagline">Interactive Multiline Text Measurement & Dragon Navigation</p>
    </header>
    <main class="article-columns" id="articleColumns">
      <div class="column col-1" id="col1"></div>
      <div class="column col-2" id="col2"></div>
      <div class="column col-3" id="col3"></div>
    </main>
    <footer class="stats-bar" id="statsBar"></footer>
  </div>
`;

const dragonSvg = document.querySelector<SVGElement>('#dragonCursor')!;
const articlesColumns = document.querySelectorAll<HTMLDivElement>('.column');
const statsBar = document.querySelector<HTMLDivElement>('#statsBar')!;

const pointerState = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  vx: 0,
  vy: 0,
};

let animationFrameId = 0;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const ratio = (value - inMin) / (inMax - inMin);
  return outMin + ratio * (outMax - outMin);
}

function getLayoutFromCursor(nx: number, ny: number): { width: number; lineHeight: number } {
  const minW = 180;
  const maxW = 380;
  const minLh = 18;
  const maxLh = 32;

  const width = Math.round(mapRange(nx, 0, 1, minW, maxW));
  const lineHeight = Math.round(mapRange(1 - ny, 0, 1, minLh, maxLh));

  return { width, lineHeight };
}

function updateDragonCursor(): void {
  dragonSvg.style.display = 'block';
  dragonSvg.style.left = `${pointerState.x - 16}px`;
  dragonSvg.style.top = `${pointerState.y - 12}px`;

  const angle = Math.atan2(pointerState.vy, pointerState.vx) * (180 / Math.PI);
  dragonSvg.style.transform = `rotate(${angle + 90}deg)`;
}

function splitTextIntoColumns(text: string, columnCount: number, width: number, lineHeight: number): string[] {
  const font = '16px "Fira Serif"';
  const prepared = prepareWithSegments(text, font, { whiteSpace: 'normal' });
  const columnHeight = window.innerHeight - 300;
  const maxLinesPerColumn = Math.max(1, Math.floor(columnHeight / lineHeight));

  const layoutResult = layoutWithLines(prepared, width, lineHeight);
  const lines = layoutResult.lines;

  const columns: string[] = Array(columnCount).fill('');
  let currentCol = 0;
  let linesInCurrentCol = 0;

  for (const line of lines) {
    if (linesInCurrentCol >= maxLinesPerColumn && currentCol < columnCount - 1) {
      currentCol++;
      linesInCurrentCol = 0;
    }
    columns[currentCol] += line.text + '\n';
    linesInCurrentCol++;
  }

  return columns;
}

function render(): void {
  const nx = clamp(pointerState.x / window.innerWidth, 0, 1);
  const ny = clamp(pointerState.y / window.innerHeight, 0, 1);

  const { width, lineHeight } = getLayoutFromCursor(nx, ny);
  const columnTexts = splitTextIntoColumns(sampleText, 3, width, lineHeight);

  const font = '16px "Fira Serif"';

  columnTexts.forEach((text, idx) => {
    const col = articlesColumns[idx];
    if (!col) return;

    const prepared = prepareWithSegments(text.trim(), font, { whiteSpace: 'normal' });
    const summary = layout(prepared, width, lineHeight);
    const details = layoutWithLines(prepared, width, lineHeight);

    col.style.columnWidth = `${width}px`;
    col.style.lineHeight = `${lineHeight}px`;

    col.innerHTML = details.lines
      .map((line) => {
        const escaped = line.text
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
        return `<p style="margin: 0; line-height: ${lineHeight}px;">${escaped}</p>`;
      })
      .join('');
  });

  statsBar.innerHTML = `
    <span class="stat">Cursor: ${Math.round(nx * 100)}% × ${Math.round(ny * 100)}%</span>
    <span class="stat">Width: ${width}px</span>
    <span class="stat">Line Height: ${lineHeight}px</span>
    <span class="stat">Dragon Position: (${Math.round(pointerState.x)}, ${Math.round(pointerState.y)})</span>
  `;

  updateDragonCursor();
}

function startMotionLoop(): void {
  if (animationFrameId !== 0) return;

  const tick = () => {
    render();
    animationFrameId = requestAnimationFrame(tick);
  };

  animationFrameId = requestAnimationFrame(tick);
}

document.addEventListener('pointermove', (event) => {
  const dx = event.clientX - pointerState.x;
  const dy = event.clientY - pointerState.y;

  pointerState.vx = dx * 0.5;
  pointerState.vy = dy * 0.5;
  pointerState.x = event.clientX;
  pointerState.y = event.clientY;

  startMotionLoop();
});

window.addEventListener('load', () => {
  pointerState.x = window.innerWidth / 2;
  pointerState.y = window.innerHeight / 2;
  render();
});

render();
startMotionLoop();

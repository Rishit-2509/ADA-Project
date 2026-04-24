/* =================================================
   PlagiaScope — app.js
   LCS-Based Plagiarism / Cheating Detection Tool
================================================= */

const docs = [];
const MAX_DOCS = 5; 
const MAX_WORDS = 5000;
let isAnalyzing = false; // Prevents multi-click race conditions

const dropZone  = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles([...e.dataTransfer.files]);
});
fileInput.addEventListener('change', () => handleFiles([...fileInput.files]));

function handleFiles(files) {
  if (docs.length + files.length > MAX_DOCS) {
    alert(`You can only compare up to ${MAX_DOCS} documents at a time to maintain performance.`);
    files = files.slice(0, MAX_DOCS - docs.length);
  }

  files.forEach(f => {
    // Validation: File type check to avoid binary/garbage files
    if (!f.type.includes("text") && !f.name.match(/\.(txt|md|html|csv)$/i)) {
      alert(`Invalid file type skipped: ${f.name}. Please upload text-based files.`);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = e => {
      const text = e.target.result;
      const wordCount = tokenize(text).length;
      
      // Validation: Empty or unreadable text
      if (wordCount === 0) {
        alert(`File is empty or contains no valid text: ${f.name}`);
        return;
      }
      
      // Validation: True word limit check BEFORE processing
      if (wordCount > MAX_WORDS) {
        alert(`File exceeds the ${MAX_WORDS} word limit: ${f.name}`);
        return;
      }

      // Validation: Duplicate check
      if (docs.some(d => d.name === f.name || d.text === text)) {
        alert(`Duplicate file or content skipped: ${f.name}`);
        return;
      }

      docs.push({ name: f.name, text: text });
      renderChips();
    };

    // Validation: File read error handling
    reader.onerror = () => {
      alert(`Error reading file: ${f.name}. The file may be corrupted.`);
    };

    reader.readAsText(f);
  });
}

function togglePaste() {
  document.getElementById('pasteBlock').classList.toggle('open');
}

function addPastedDoc() {
  if (docs.length >= MAX_DOCS) {
    alert(`Maximum ${MAX_DOCS} documents allowed.`);
    return;
  }

  const ta  = document.getElementById('pasteArea');
  const txt = ta.value.trim();
  
  if (!txt) { 
    alert('Please enter some text first.'); 
    return; 
  }

  const wordCount = tokenize(txt).length;
  if (wordCount === 0) { 
    alert('No valid words found in pasted text.'); 
    return; 
  }
  
  if (wordCount > MAX_WORDS) { 
    alert(`Pasted text exceeds the ${MAX_WORDS} word limit.`); 
    return; 
  }

  if (docs.some(d => d.text === txt)) {
    alert('Duplicate content skipped.');
    return;
  }

  docs.push({ name: `Pasted Doc ${docs.length + 1}`, text: txt });
  ta.value = '';
  renderChips();
}

function renderChips() {
  const cont = document.getElementById('fileChips');
  cont.innerHTML = '';
  docs.forEach((d, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `
      <div class="chip-num">${i + 1}</div>
      <span title="${d.name}">${truncate(d.name, 22)}</span>
      <span class="chip-del" onclick="removeDoc(${i})" title="Remove">✕</span>
    `;
    cont.appendChild(chip);
  });
  document.getElementById('analyseBtn').disabled = docs.length < 2;
}

function removeDoc(i) {
  docs.splice(i, 1);
  renderChips();
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function runAnalysis() {
  // Validation: Ensure enough documents exist before running
  if (docs.length < 2) {
    alert("Please upload at least 2 documents to compare.");
    return;
  }
  
  // Validation: Prevent multi-click executions
  if (isAnalyzing) return;
  isAnalyzing = true;

  const btn = document.getElementById('analyseBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  setTimeout(() => {
    const t0 = performance.now();
    const pairs       = buildPairs(docs);
    const pairResults = pairs.map(([i, j]) => comparePair(docs[i], docs[j], i + 1, j + 1)).filter(p => p !== null);
    const elapsed = (performance.now() - t0).toFixed(2);

    renderResults(pairResults, elapsed);
    btn.classList.remove('loading');
    btn.disabled = false;
    isAnalyzing = false;
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
  }, 80);
}

function buildPairs(docs) {
  const pairs = [];
  for (let i = 0; i < docs.length; i++)
    for (let j = i + 1; j < docs.length; j++)
      pairs.push([i, j]);
  return pairs;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

function lcs(a, b) {
  const M = a.length;
  const N = b.length;

  const dp = [];
  for (let i = 0; i <= M; i++) dp[i] = new Uint16Array(N + 1);

  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLength = dp[M][N];
  const matchedA = new Uint8Array(M);
  const matchedB = new Uint8Array(N);
  let i = M, j = N;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      matchedA[i - 1] = 1;
      matchedB[j - 1] = 1;
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return { length: lcsLength, matchedA, matchedB, A: a, B: b };
}

function comparePair(docA, docB, numA, numB) {
  const wordsA = tokenize(docA.text);
  const wordsB = tokenize(docB.text);

  // Validation: Skip if one of the documents is completely empty after tokenization
  if (wordsA.length === 0 || wordsB.length === 0) return null;

  const result = lcs(wordsA, wordsB);
  
  // Logic Fix: Symmetric similarity calculation using average length
  const total = (wordsA.length + wordsB.length) / 2;

  const similarity = total === 0 ? 0 : (result.length / total) * 100;
  const dissimilarity = 100 - similarity;

  return {
    numA, numB,
    nameA: docA.name,
    nameB: docB.name,
    textA: docA.text,
    textB: docB.text,
    wordsA:   result.A,
    wordsB:   result.B,
    matchedA: result.matchedA,
    matchedB: result.matchedB,
    similarity:    +similarity.toFixed(1),
    dissimilarity: +dissimilarity.toFixed(1),
    lcsLen: result.length
  };
}

function renderResults(pairs, elapsed) {
  const section   = document.getElementById('results');
  const container = document.getElementById('pairResults');
  const execBadge = document.getElementById('execBadge');

  if (pairs.length === 0) {
    alert("Not enough valid documents to generate results.");
    return;
  }

  execBadge.innerHTML = `Execution Time: <strong>${elapsed} ms</strong>`;
  container.innerHTML = '';

  pairs.forEach((p, idx) => {
    // Logic Fix: Multi-tier dynamic threshold
    let severityClass = 'low';
    let severityLabel = 'Minimal-similarity';
    if (p.similarity > 70) {
      severityClass = 'high';
      severityLabel = 'High-similarity';
    } else if (p.similarity > 40) {
      severityClass = 'moderate';
      severityLabel = 'Moderate-similarity';
    }

    // Logic Fix: Show dissimilar details intuitively 
    const showDissimDetails = p.dissimilarity > 0;

    const card = document.createElement('div');
    card.className = `pair-card`;

    const header = `
      <div class="pair-header">
        <div class="pair-title">
          Comparison: File ${p.numA} vs File ${p.numB}
        </div>
        <div class="verdict-badge ${severityClass}">
          ${severityLabel}
        </div>
      </div>`;

    const metrics = `
      <div class="metrics">
        <div class="metric">
          <div class="metric-label">File 1</div>
          <div class="metric-value" style="font-size:1.1rem;">${truncate(p.nameA, 18)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">File 2</div>
          <div class="metric-value" style="font-size:1.1rem;">${truncate(p.nameB, 18)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Similarity</div>
          <div class="metric-value sim">${p.similarity}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">Dissimilarity</div>
          <div class="metric-value dissim">${p.dissimilarity}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">Common Words</div>
          <div class="metric-value" style="color:var(--accent)">${p.lcsLen}</div>
        </div>
      </div>`;

    let matchSection = '';
    if (p.similarity > 40) {
      const hlA = buildHighlightedHtml(p.wordsA, p.matchedA, 'match');
      const hlB = buildHighlightedHtml(p.wordsB, p.matchedB, 'match');
      matchSection = `
        <div class="section-block">
          <h4>Matching Parts</h4>
          <div class="doc-compare">
            <div class="doc-pane">
              <div class="doc-pane-label">File ${p.numA} <span class="fname">${p.nameA}</span></div>
              <div class="doc-pane-text">${hlA}</div>
            </div>
            <div class="doc-pane">
              <div class="doc-pane-label">File ${p.numB} <span class="fname">${p.nameB}</span></div>
              <div class="doc-pane-text">${hlB}</div>
            </div>
          </div>
        </div>`;
    }

    let dissimSection = '';
    if (showDissimDetails) {
      const pairId  = `dissim-${idx}`;
      const diffItems = buildDiffItems(p.wordsA, p.matchedA, p.wordsB, p.matchedB);
      const diffHtml  = diffItems.length === 0
        ? '<p style="color:var(--muted);font-size:.9rem">No significant unique phrases found.</p>'
        : diffItems.slice(0, 30).map(d => `
            <div class="dissim-item">
              <div>
                <div class="only-in">Only in File ${p.numA}</div>
                <div class="diff-text">${d.onlyA || '<em style="color:var(--muted)">—</em>'}</div>
              </div>
              <div>
                <div class="only-in">Only in File ${p.numB}</div>
                <div class="diff-text">${d.onlyB || '<em style="color:var(--muted)">—</em>'}</div>
              </div>
            </div>`).join('');

      dissimSection = `
        <div class="section-block" id="sec-${pairId}">
          <button class="btn-dissimilar" id="btn-${pairId}" onclick="toggleDissim('${pairId}')">
            View Dissimilar Details
            <span class="arrow">▾</span>
          </button>
          <div class="dissim-details" id="det-${pairId}">
            <div class="dissim-list">${diffHtml}</div>
          </div>
        </div>`;
    }

    card.innerHTML = header + metrics + matchSection + dissimSection;
    container.appendChild(card);
  });

  section.classList.remove('hidden');
}

function buildHighlightedHtml(words, matched, cls) {
  if (!words || words.length === 0)
    return '<em style="color:var(--muted)">Empty document</em>';

  let html = '';
  let i = 0;
  while (i < words.length) {
    if (matched[i]) {
      let run = '';
      while (i < words.length && matched[i]) {
        run += (run ? ' ' : '') + escHtml(words[i]);
        i++;
      }
      html += `<mark class="${cls}">${run}</mark> `;
    } else {
      html += escHtml(words[i]) + ' ';
      i++;
    }
  }
  return html.trim();
}

function buildDiffItems(wordsA, matchedA, wordsB, matchedB) {
  const onlyA = extractUnmatched(wordsA, matchedA);
  const onlyB = extractUnmatched(wordsB, matchedB);
  const len   = Math.max(onlyA.length, onlyB.length);
  const items = [];
  for (let i = 0; i < len; i++) {
    items.push({ onlyA: onlyA[i] || '', onlyB: onlyB[i] || '' });
  }
  return items;
}

function extractUnmatched(words, matched) {
  const groups = [];
  let i = 0;
  while (i < words.length) {
    if (!matched[i]) {
      let run = '';
      while (i < words.length && !matched[i]) {
        run += (run ? ' ' : '') + escHtml(words[i]);
        i++;
      }
      if (run.trim()) groups.push(run.trim());
    } else {
      i++;
    }
  }
  return groups;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toggleDissim(pairId) {
  const btn = document.getElementById(`btn-${pairId}`);
  const det = document.getElementById(`det-${pairId}`);
  btn.classList.toggle('open');
  det.classList.toggle('open');
  btn.querySelector('.arrow').textContent =
    btn.classList.contains('open') ? '▴' : '▾';
}
import './style.css';
import { TYPES, calculateBudget } from './budget.js';
import { defaultEdges, readyForBudget, normalizeRegion } from './review.js';
const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const key = 'master-cut-budget-v1';
let saved;
try { saved = JSON.parse(localStorage.getItem(key)); } catch {}
const newPiece = (type = 'Lateral') => ({ id: crypto.randomUUID(), type, width: 0, height: 0, quantity: 1, material: '', placement: 'unknown', confirmed: false, included: true, region: null, edges: defaultEdges(type, 'unknown') });
let state = { name: '', cut: 4.5, edge: 4.5, pieces: [], doubts: [], photoId: null };
if (saved && Array.isArray(saved.pieces) && saved.pieces.every(p => p && typeof p.id === 'string' && TYPES.includes(p.type) && p.edges)) state = { ...state, ...saved };
state.pieces = state.pieces.map(p => ({ ...newPiece(p.type), ...p, confirmed: p.confirmed === true, material: p.material || '' }));
state.doubts ||= [];
let selectedId = null;
let marking = null;
let photoUrl = '';
let photoName = '';
let storageError = false;
const icons = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  print: '<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.plus}</svg>`;
const app = document.querySelector('#app');
app.innerHTML = `
<header class="topbar"><a class="brand" href="./" aria-label="Master Cut início"><span class="brand-mark">M<span>╱</span></span><div>MASTER CUT<small>ORÇAMENTOS</small></div></a><span class="header-note"><span class="dot"></span>Seu ateliê, mais organizado</span><button class="button quiet" id="print">${icon('print')}<span>Imprimir orçamento</span></button></header>
<main><div class="intro"><div><div class="eyebrow">DO PROJETO AO CORTE</div><h1>Seu próximo projeto<br>começa aqui<span>.</span></h1><p>Organize as peças. Defina os acabamentos. Calcule com clareza.</p></div><div class="version"><span class="dot"></span> Orçamento de móveis planejados</div></div>
<div class="project-bar"><label for="project-name">NOME DO PROJETO<input id="project-name" placeholder="Ex.: Armário da cozinha" maxlength="120" value="${escape(state.name)}"></label><span id="save-status" role="status">${icon('check')} Salvo neste navegador</span></div>
<div class="workspace"><section class="photo-panel panel"><div class="section-title"><div><span class="step">01</span><h2>Referência do móvel</h2></div><span class="badge">FOTO</span></div><div class="upload-zone" id="upload-zone"><div id="photo-placeholder"><span class="upload-icon">${icon('image')}</span><h3>Uma foto, um ponto de partida.</h3><p>Arraste a foto do móvel para cá<br>ou clique para escolher um arquivo</p><button class="button primary" id="choose-photo">${icon('plus')} Carregar foto</button><small>JPG, PNG ou WEBP · até 10 MB</small></div><div id="photo-stage" hidden><img id="photo" alt="Foto de referência do móvel" draggable="false"><div id="regions"></div><div id="drawing" hidden></div></div></div><input type="file" id="photo-input" accept="image/jpeg,image/png,image/webp" hidden><div class="photo-actions" hidden><span id="photo-name"></span><button class="text-button" id="remove-photo">Remover foto</button></div><div class="auto-analysis"><button class="button primary" id="analyze-photo">Calcular material</button><p id="analysis-status">Carregue uma foto e clique em <strong>Calcular material</strong>.</p></div><div class="review-toolbar"><button class="button quiet" id="mark-piece">Marcar peça visível</button><button class="button quiet" id="mark-doubt">Marcar pendência</button><button class="text-button" id="cancel-mark" hidden>Cancelar marcação</button></div><p id="mark-status" role="status">Conferência manual · nenhum reconhecimento automático integrado.</p><p id="photo-error" class="error" role="alert"></p><div class="note"><span>i</span><p><strong>A foto é sua referência visual.</strong>Marque apenas partes suficientemente visíveis. Regiões ocultas ou incertas devem ser registradas como pendências. Medidas e materiais exigem confirmação humana.</p></div><div class="photo-footer"><span>FEITO PARA QUEM TRANSFORMA</span><strong>Ideias em móveis.</strong></div></section>
<section class="pieces-panel panel"><div class="section-title"><div><span class="step">02</span><h2>Peças do projeto</h2></div><span class="badge" id="row-count">0 ITENS</span></div><div class="pieces-description"><p>Medidas em <strong>milímetros (mm)</strong>. Marque os lados que recebem fita.</p></div><div id="doubts"></div><div id="pieces"></div><div class="add-area"><label for="piece-type" class="sr-only">Tipo de peça a adicionar</label><select id="piece-type">${TYPES.map(type => `<option>${type}</option>`).join('')}</select><button class="button primary" id="add-piece">${icon('plus')} Adicionar peça</button></div><div class="suggestions"><span>ADICIONE RAPIDAMENTE</span><div>${TYPES.map(type => `<button class="chip" data-add="${type}">${icon('plus')}${type}</button>`).join('')}</div></div></section></div>
<section class="budget panel"><div class="budget-heading"><div class="section-title"><div><span class="step">03</span><h2>Resumo do orçamento</h2></div></div><p>Corte e acabamento, sem complicação.</p><div class="rates"><label for="cut-price">Corte por peça (R$)<input id="cut-price" type="number" min="0" step="0.01" value="${state.cut}"></label><label for="edge-price">Fita por metro (R$)<input id="edge-price" type="number" min="0" step="0.01" value="${state.edge}"></label></div></div><div class="metric"><span>PEÇAS PARA CORTE</span><strong id="total-pieces">0<small> peças</small></strong><p id="cut-total">R$ 0,00 em cortes</p></div><div class="metric"><span>FITA DE BORDA</span><strong id="total-meters">0<small> m</small></strong><p id="edge-total">R$ 0,00 em fita</p></div><div class="grand-total"><span>VALOR TOTAL ESTIMADO</span><strong id="grand-total">R$ 0,00</strong><p>A soma de cortes + fita de borda</p></div></section><p class="disclaimer">Este orçamento considera somente cortes e fita de borda. Materiais, ferragens, montagem e perdas não estão incluídos.</p><footer><span>MASTER CUT <span class="footer-divider">/</span> Precisão em cada detalhe.</span><span>Medidas em mm · Valores em reais</span></footer></main>`;
function persist() {
  try { localStorage.setItem(key, JSON.stringify(state)); storageError = false; } catch { storageError = true; }
  document.querySelector('#save-status').innerHTML = storageError ? 'Não foi possível salvar neste navegador' : `${icon('check')} Salvo neste navegador`;
}
function updateTotals() {
  const totals = calculateBudget(state.pieces, state);
  document.querySelector('#total-pieces').innerHTML = `${totals.quantity}<small> peças</small>`;
  document.querySelector('#total-meters').innerHTML = `${decimal(totals.meters)}<small> m</small>`;
  document.querySelector('#cut-total').textContent = `${money(totals.cutCost)} em cortes`;
  document.querySelector('#edge-total').textContent = `${money(totals.edgeCost)} em fita`;
  document.querySelector('#grand-total').textContent = money(totals.total);
  totals.rows.forEach((row, index) => {
    const piece = state.pieces[index];
    document.querySelector(`[data-id="${piece.id}"] .board-label small`).textContent = `${piece.width || '?'} × ${piece.height || '?'} mm`;
    document.querySelector(`[data-total="${piece.id}"]`).textContent = money(row.total);
    document.querySelector(`[data-meters="${piece.id}"]`).textContent = `${decimal(row.meters)} m de fita`;
    document.querySelector(`[data-review="${piece.id}"]`).textContent = piece.included === false ? 'Não considerada no cálculo' : readyForBudget(piece) ? 'Conferida · incluída no orçamento' : 'Fora do cálculo: confirme medidas, material e identificação';
  });
  document.querySelector('#row-count').textContent = `${state.pieces.length} ${state.pieces.length === 1 ? 'ITEM' : 'ITENS'}`;
  persist();
}
function renderPieces() {
  document.querySelector('#pieces').innerHTML = state.pieces.length ? state.pieces.map((piece, index) => `<article class="piece ${piece.included === false ? 'excluded' : ''}" data-id="${piece.id}"><div class="piece-heading"><span class="piece-index">${String(index + 1).padStart(2, '0')}</span><label class="sr-only" for="type-${piece.id}">Tipo da peça ${index + 1}</label><select id="type-${piece.id}" data-field="type">${TYPES.map(type => `<option ${piece.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select><div class="piece-tools"><button class="icon-button" data-action="copy" aria-label="Duplicar ${piece.type}" title="Duplicar peça">${icon('copy')}</button><button class="icon-button danger" data-action="remove" aria-label="Remover ${piece.type}" title="Remover peça">${icon('trash')}</button></div></div>${piece.reviewNote ? `<p class="applied-explanation"><strong>Explicação da região:</strong> ${escape(piece.reviewNote)}</p>` : ''}<div class="review-actions"><button class="text-button" data-action="edit">Editar</button><button class="text-button" data-action="exclude">${piece.included === false ? 'Considerar novamente' : 'Não considerar'}</button><button class="text-button" data-action="region">${piece.region ? 'Remarcar região' : 'Vincular à foto'}</button></div><div class="material-fields"><label>Construção<select data-field="placement"><option value="unknown" ${piece.placement === 'unknown' ? 'selected' : ''}>Não definida</option><option value="internal" ${piece.placement === 'internal' ? 'selected' : ''}>Estrutura interna</option><option value="external" ${piece.placement === 'external' ? 'selected' : ''}>Externa / aparente</option><option value="glass" ${piece.placement === 'glass' ? 'selected' : ''}>Interior visível por vidro</option></select></label><label>Material (confirmar)<input data-field="material" value="${escape(piece.material)}" placeholder="Material não identificado" list="materials"></label></div><p class="material-suggestion">${piece.placement === 'internal' ? 'Sugestão: MDF Branco TX' : ['external', 'glass'].includes(piece.placement) ? 'Sugestão: MDF madeirado' : 'Defina a construção; nenhum material será presumido.'} ${piece.placement !== 'unknown' ? '<button class="text-button" data-action="suggest-material">Usar sugestão</button>' : ''}</p><div class="dimensions">${[['width', 'Largura', 'mm'], ['height', 'Altura', 'mm'], ['quantity', 'Quantidade', 'un.']].map(([field, label, unit]) => `<label>${label}<div class="input-unit"><input type="number" data-field="${field}" aria-label="${label} da peça ${index + 1}" min="${field === 'quantity' ? 1 : 0}" step="1" value="${piece[field] || ''}" placeholder="0"><span>${unit}</span></div></label>`).join('')}</div><div class="piece-bottom"><fieldset><legend>FITA DE BORDA · CLIQUE NOS LADOS</legend><div class="edge-diagram"><span class="board-label">${escape(piece.type)}<small>${piece.width || '?'} × ${piece.height || '?'} mm</small></span>${[['top', 'Superior'], ['bottom', 'Inferior'], ['left', 'Esquerda'], ['right', 'Direita']].map(([side, label]) => `<button class="board-edge ${side} ${piece.edges[side] ? 'active' : ''}" data-edge="${side}" aria-label="Fita ${label}" aria-pressed="${!!piece.edges[side]}">${label}</button>`).join('')}</div></fieldset><div class="piece-price"><strong data-total="${piece.id}"></strong><small data-meters="${piece.id}"></small></div></div><label class="confirm-piece"><input type="checkbox" data-field="confirmed" ${piece.confirmed ? 'checked' : ''}> Confirmei a identificação, medidas, quantidade e material</label><p class="review-status" data-review="${piece.id}"></p></article>`).join('') : `<div class="empty-pieces"><span class="empty-drawing">▱</span><h3>Cada peça conta.</h3><p>Comece adicionando uma lateral, base ou prateleira.<br>Seu orçamento aparece conforme você preenche.</p></div>`;
  updateTotals();
  renderRegions();
  syncSelection();
}
function addPiece(type) { const piece = newPiece(type); state.pieces.push(piece); selectedId = piece.id; renderPieces(); const last = document.querySelector('#pieces .piece:last-child input[data-field="width"]'); last?.focus({ preventScroll: true }); }
document.querySelector('#add-piece').addEventListener('click', () => addPiece(document.querySelector('#piece-type').value));
document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addPiece(button.dataset.add)));
document.querySelector('#pieces').addEventListener('input', event => {
  const article = event.target.closest('[data-id]');
  if (!article) return;
  const piece = state.pieces.find(p => p.id === article.dataset.id);
  if (event.target.dataset.field) {
    const field = event.target.dataset.field;
    if (field === 'confirmed') piece.confirmed = event.target.checked;
    else {
      piece.confirmed = false;
      piece[field] = ['type', 'material', 'placement'].includes(field) ? event.target.value : Math.max(0, Number(event.target.value) || 0);
      if (field === 'type' || field === 'placement') {
        piece.edges = defaultEdges(piece.type, piece.placement);
        if (field === 'placement') piece.material = '';
        renderPieces(); return;
      }
      article.querySelector('[data-field="confirmed"]').checked = false;
    }
  }
  updateTotals();
});
document.querySelector('#pieces').addEventListener('change', event => { if (event.target.type === 'number') { const piece = state.pieces.find(p => p.id === event.target.closest('[data-id]').dataset.id); event.target.value = piece[event.target.dataset.field]; } });
document.querySelector('#pieces').addEventListener('click', event => {
  const article = event.target.closest('[data-id]'); if (!article) return;
  selectedId = article.dataset.id; syncSelection();
  const piece = state.pieces.find(p => p.id === selectedId);
  const edge = event.target.closest('[data-edge]');
  if (edge) { piece.edges[edge.dataset.edge] = !piece.edges[edge.dataset.edge]; renderPieces(); return; }
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  if (action === 'remove') state.pieces = state.pieces.filter(p => p.id !== selectedId);
  if (action === 'copy') { const copy = { ...piece, id: crypto.randomUUID(), region: null, confirmed: false, edges: { ...piece.edges } }; state.pieces.push(copy); selectedId = copy.id; }
  if (action === 'exclude') piece.included = piece.included === false;
  if (action === 'suggest-material') { piece.material = piece.placement === 'internal' ? 'MDF Branco TX' : 'MDF madeirado'; piece.confirmed = false; }
  if (action === 'region') { startMark('piece', piece.id); return; }
  if (action === 'edit') { article.querySelector('[data-field="width"]').focus(); return; }
  renderPieces();
});
document.querySelector('#project-name').addEventListener('input', event => { state.name = event.target.value; persist(); });
for (const [id, field] of [['cut-price', 'cut'], ['edge-price', 'edge']]) {
  document.querySelector(`#${id}`).addEventListener('input', event => { state[field] = Math.max(0, Number(event.target.value) || 0); updateTotals(); });
  document.querySelector(`#${id}`).addEventListener('change', event => { event.target.value = state[field]; });
}
async function photoStore(action, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('master-cut-photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('photos', action === 'get' ? 'readonly' : 'readwrite');
      const store = tx.objectStore('photos');
      const operation = action === 'get' ? store.get('current') : store.put(value, 'current');
      let result; operation.onsuccess = () => { result = operation.result; };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
let currentPhotoFile = null;
function showPhoto(file) {
  currentPhotoFile = file;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file); photoName = file.name || 'Foto do projeto';
  document.querySelector('#photo').src = photoUrl;
  document.querySelector('#photo-stage').hidden = false;
  document.querySelector('#photo-placeholder').hidden = true;
  document.querySelector('.photo-actions').hidden = false;
  document.querySelector('#photo-name').textContent = photoName;
  document.querySelector('#upload-zone').classList.add('has-photo');
  renderRegions();
}
let photoVersion = 0;
async function loadPhoto(file) {
  if (!file) return;
  const error = document.querySelector('#photo-error');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { error.textContent = 'Escolha uma imagem JPG, PNG ou WEBP de até 10 MB.'; return; }
  const version = ++photoVersion;
  try { const bitmap = await createImageBitmap(file); bitmap.close(); } catch { error.textContent = 'Não foi possível abrir esta imagem.'; return; }
  if (version !== photoVersion) return;
  if (state.photoId && (state.pieces.some(p => p.region) || state.doubts.length) && !window.confirm('Trocar a foto remove as marcações e pendências da imagem anterior. As peças serão mantidas, mas precisarão de nova conferência. Continuar?')) return;
  state.pieces.forEach(p => { p.region = null; p.confirmed = false; }); state.doubts = [];
  state.photoId = crypto.randomUUID();
  showPhoto(file); cancelMark(); renderDoubts(); renderPieces(); error.textContent = '';
  try { await photoStore('put', { id: state.photoId, file }); } catch { error.textContent = 'A foto está disponível nesta sessão, mas não pôde ser salva para a próxima visita.'; }
}
async function analyzePhoto() {
  const button = document.querySelector('#analyze-photo');
  const status = document.querySelector('#analysis-status');
  const error = document.querySelector('#photo-error');
  if (!currentPhotoFile) { error.textContent = 'Carregue uma foto antes de calcular o material.'; return; }
  error.textContent = ''; button.disabled = true; status.textContent = 'Analisando a foto e procurando somente móveis suficientemente visíveis…';
  try {
    const form = new FormData(); form.append('image', currentPhotoFile, currentPhotoFile.name || 'movel.jpg');
    const response = await fetch('/api/analyze', { method: 'POST', body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível analisar a foto.');
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const doubts = Array.isArray(data.doubts) ? data.doubts : [];
    const accepted = candidates.filter(item => item && TYPES.includes(item.type) && item.region && Number(item.confidence || 0) >= 0.62);
    state.pieces = accepted.map(item => {
      const placement = ['internal','external','glass'].includes(item.placement) ? item.placement : 'unknown';
      const piece = newPiece(item.type);
      piece.width = Math.max(0, Math.round(Number(item.width) || 0)); piece.height = Math.max(0, Math.round(Number(item.height) || 0)); piece.quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
      piece.placement = placement; piece.material = item.material || (placement === 'internal' ? 'MDF Branco TX' : ['external','glass'].includes(placement) ? 'MDF madeirado' : '');
      piece.region = item.region; piece.edges = item.edges && typeof item.edges === 'object' ? { ...defaultEdges(piece.type, placement), ...item.edges } : defaultEdges(piece.type, placement);
      piece.confirmed = false; piece.estimated = true; piece.reviewNote = item.reason || 'Medidas estimadas pela análise da foto.'; return piece;
    });
    state.doubts = doubts.filter(d => d?.region).map(d => ({ id: crypto.randomUUID(), region: d.region, question: d.question || 'Não consigo identificar esta região com segurança.', explanation: '', appliedExplanation: '', resolved: false }));
    renderDoubts(); renderPieces();
    status.textContent = accepted.length ? 'Análise concluída: ' + accepted.length + ' peça(s) estimada(s). Confira e confirme antes de entrar no orçamento.' : 'A IA não encontrou peças com segurança suficiente. Veja as pendências em vermelho.';
  } catch (err) { error.textContent = err.message; status.textContent = 'A análise automática não foi concluída. O preenchimento manual continua disponível.'; }
  finally { button.disabled = false; }
}
document.querySelector('#analyze-photo').addEventListener('click', analyzePhoto);
document.querySelector('#choose-photo').addEventListener('click', () => document.querySelector('#photo-input').click());
document.querySelector('#photo-input').addEventListener('change', event => { loadPhoto(event.target.files[0]); event.target.value = ''; });
const upload = document.querySelector('#upload-zone');
for (const name of ['dragenter', 'dragover']) upload.addEventListener(name, event => { event.preventDefault(); upload.classList.add('dragging'); });
for (const name of ['dragleave', 'drop']) upload.addEventListener(name, event => { event.preventDefault(); upload.classList.remove('dragging'); if (name === 'drop') loadPhoto(event.dataTransfer.files[0]); });
document.querySelector('#remove-photo').addEventListener('click', () => {
  if (!window.confirm('Remover a foto e suas marcações? As peças serão mantidas para nova conferência.')) return;
  ++photoVersion; if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = ''; currentPhotoFile = null;
  state.photoId = null; state.doubts = []; state.pieces.forEach(p => { p.region = null; p.confirmed = false; });
  document.querySelector('#photo-stage').hidden = true; document.querySelector('#photo').removeAttribute('src');
  document.querySelector('#photo-placeholder').hidden = false; document.querySelector('.photo-actions').hidden = true;
  upload.classList.remove('has-photo'); cancelMark(); renderDoubts(); renderPieces();
});
function syncSelection() {
  document.querySelectorAll('[data-id]').forEach(el => el.classList.toggle('selected', el.dataset.id === selectedId));
  document.querySelectorAll('[data-region-id]').forEach(el => el.classList.toggle('selected', el.dataset.regionId === selectedId));
}
function selectRegion(id) {
  selectedId = id; syncSelection();
  const card = [...document.querySelectorAll('[data-id]')].find(el => el.dataset.id === id);
  card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function renderRegions() {
  const regions = [...state.pieces.filter(p => p.region).map(p => ({ ...p, label: p.type, doubt: false })), ...state.doubts.map(d => ({ ...d, label: d.resolved ? 'Explicação aplicada' : 'Pendência', doubt: true }))];
  document.querySelector('#regions').innerHTML = regions.map(item => `<button class="photo-region ${item.doubt ? 'doubt-region' : ''} ${item.resolved ? 'resolved' : ''} ${item.included === false ? 'excluded' : ''}" data-region-id="${item.id}" style="left:${item.region.x * 100}%;top:${item.region.y * 100}%;width:${item.region.width * 100}%;height:${item.region.height * 100}%" aria-label="Selecionar ${escape(item.label)}"><span>${escape(item.label)}</span></button>`).join('');
  syncSelection();
}
document.querySelector('#regions').addEventListener('click', event => { const button = event.target.closest('[data-region-id]'); if (button && !marking) selectRegion(button.dataset.regionId); });
function startMark(kind, id = null) {
  if (!photoUrl) { document.querySelector('#photo-error').textContent = 'Carregue uma foto para marcar regiões.'; return; }
  marking = {kind, id}; document.querySelector('#photo-stage').classList.add('marking');
  document.querySelector('#cancel-mark').hidden = false;
  document.querySelector('#mark-status').textContent = 'Arraste sobre a foto para delimitar a região. Medidas não são extraídas da imagem.';
}
function cancelMark() { marking = null; document.querySelector('#photo-stage').classList.remove('marking'); document.querySelector('#drawing').hidden = true; document.querySelector('#cancel-mark').hidden = true; document.querySelector('#mark-status').textContent = 'Conferência manual · nenhum reconhecimento automático integrado.'; }
document.querySelector('#mark-piece').addEventListener('click', () => startMark('piece'));
document.querySelector('#mark-doubt').addEventListener('click', () => startMark('doubt'));
document.querySelector('#cancel-mark').addEventListener('click', cancelMark);
document.addEventListener('keydown', event => { if (event.key === 'Escape') cancelMark(); });
const stage = document.querySelector('#photo-stage');
const point = event => { const rect = stage.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }; };
let origin = null;
stage.addEventListener('pointerdown', event => { if (!marking || event.button !== 0) return; event.preventDefault(); origin = point(event); stage.setPointerCapture(event.pointerId); });
stage.addEventListener('pointermove', event => { if (!marking || !origin) return; const r = normalizeRegion(origin, point(event)); const drawing = document.querySelector('#drawing'); drawing.hidden = false; Object.assign(drawing.style, {left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%`}); });
stage.addEventListener('pointercancel', () => { origin = null; cancelMark(); });
stage.addEventListener('pointerup', event => {
  if (!marking || !origin) return;
  const region = normalizeRegion(origin, point(event)); origin = null;
  if (region.width < .015 || region.height < .015) return;
  if (marking.kind === 'doubt') {
    const doubt = { id: crypto.randomUUID(), region, question: 'O que existe nesta região? Há informação suficiente para identificar peça, medidas, material e construção?', explanation: '', appliedExplanation: '', resolved: false };
    state.doubts.push(doubt); selectedId = doubt.id;
  } else {
    const piece = marking.id ? state.pieces.find(p => p.id === marking.id) : newPiece(document.querySelector('#piece-type').value);
    if (!marking.id) state.pieces.push(piece);
    piece.region = region; piece.confirmed = false; selectedId = piece.id;
  }
  cancelMark(); renderDoubts(); renderPieces(); selectRegion(selectedId);
});
function renderDoubts() {
  document.querySelector('#doubts').innerHTML = state.doubts.map(d => `<article class="doubt-card ${d.resolved ? 'resolved' : ''}" data-id="${d.id}"><h3>${d.resolved ? 'Explicação aplicada · conferir peça manualmente' : 'Pendência de identificação'}</h3><label>Pergunta / dúvida<textarea data-doubt="question" maxlength="1000">${escape(d.question)}</textarea></label><label>Explique esta região<textarea data-doubt="explanation" maxlength="3000" placeholder="Descreva apenas informações conhecidas…">${escape(d.explanation)}</textarea></label><button class="button quiet" data-doubt-action="apply">Aplicar explicação</button><button class="text-button" data-doubt-action="piece">Adicionar peça nesta região</button><button class="text-button" data-doubt-action="remove">Remover pendência</button>${d.appliedExplanation ? `<p class="applied-explanation"><strong>Informação usada na conferência:</strong> ${escape(d.appliedExplanation)}</p>` : ''}<p class="doubt-feedback" role="status">${d.resolved ? 'A explicação foi registrada. Nenhuma peça ou medida foi inferida; preencha e confirme a peça manualmente.' : 'Esta região não entra no cálculo.'}</p></article>`).join('');
  renderRegions();
}
document.querySelector('#doubts').addEventListener('input', event => {
  const card = event.target.closest('[data-id]'); if (!card || !event.target.dataset.doubt) return;
  const doubt = state.doubts.find(d => d.id === card.dataset.id); doubt[event.target.dataset.doubt] = event.target.value; doubt.resolved = false;
  card.classList.remove('resolved'); card.querySelector('h3').textContent = 'Pendência de identificação'; card.querySelector('.doubt-feedback').textContent = 'Explicação alterada; aplique novamente. Esta região não entra no cálculo.';
  persist(); renderRegions();
});
document.querySelector('#doubts').addEventListener('click', event => {
  const card = event.target.closest('[data-id]'); if (!card) return; selectedId = card.dataset.id; syncSelection();
  const button = event.target.closest('[data-doubt-action]'); if (!button) return;
  const doubt = state.doubts.find(d => d.id === selectedId);
  if (button.dataset.doubtAction === 'apply') {
    if (!doubt.explanation.trim()) { card.querySelector('.doubt-feedback').textContent = 'Escreva uma explicação antes de aplicar.'; return; }
    doubt.appliedExplanation = doubt.explanation.trim(); doubt.resolved = true;
  }
  if (button.dataset.doubtAction === 'remove') state.doubts = state.doubts.filter(d => d.id !== doubt.id);
  if (button.dataset.doubtAction === 'piece') {
    const piece = newPiece(document.querySelector('#piece-type').value); piece.region = { ...doubt.region }; piece.reviewNote = doubt.appliedExplanation || doubt.explanation; state.pieces.push(piece); selectedId = piece.id;
  }
  renderDoubts(); renderPieces();
});
document.querySelector('#print').addEventListener('click', () => window.print());
document.body.insertAdjacentHTML('beforeend', '<datalist id="materials"><option value="MDF Branco TX"><option value="MDF madeirado"></datalist>');
renderDoubts(); renderPieces();
const restoringVersion = photoVersion;
photoStore('get').then(record => { if (photoVersion === restoringVersion && record && record.id === state.photoId) showPhoto(record.file); }).catch(() => { if (state.photoId) document.querySelector('#photo-error').textContent = 'Não foi possível restaurar a foto. Carregue novamente para revisar as regiões.'; });

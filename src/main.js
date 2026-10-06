import './style.css';
import { TYPES, calculateBudget } from './budget.js';
const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const key = 'master-cut-budget-v1';
let saved;
try { saved = JSON.parse(localStorage.getItem(key)); } catch {}
const newPiece = (type = 'Lateral') => ({ id: crypto.randomUUID(), type, width: 0, height: 0, quantity: 1, edges: { top: false, bottom: false, left: false, right: false } });
let state = { name: '', cut: 4.5, edge: 4.5, pieces: [] };
if (saved && Array.isArray(saved.pieces) && saved.pieces.every(p => p && typeof p.id === 'string' && TYPES.includes(p.type) && p.edges)) state = { ...state, ...saved };
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
<div class="workspace"><section class="photo-panel panel"><div class="section-title"><div><span class="step">01</span><h2>Referência do móvel</h2></div><span class="badge">FOTO</span></div><label class="upload-zone" id="upload-zone" for="photo-input"><div id="photo-placeholder"><span class="upload-icon">${icon('image')}</span><h3>Uma foto, um ponto de partida.</h3><p>Arraste a foto do móvel para cá<br>ou clique para escolher um arquivo</p><span class="button primary">${icon('plus')} Carregar foto</span><small>JPG, PNG ou WEBP · até 10 MB</small></div><img id="photo" alt="Foto de referência do móvel" hidden></label><input type="file" id="photo-input" accept="image/jpeg,image/png,image/webp" hidden><div class="photo-actions" hidden><span id="photo-name"></span><button class="text-button" id="remove-photo">Remover foto</button></div><p id="photo-error" class="error" role="alert"></p><div class="note"><span>i</span><p><strong>A foto é sua referência visual.</strong>Adicione as peças ao lado e informe as medidas. A identificação automática será uma evolução futura.</p></div><div class="photo-footer"><span>FEITO PARA QUEM TRANSFORMA</span><strong>Ideias em móveis.</strong></div></section>
<section class="pieces-panel panel"><div class="section-title"><div><span class="step">02</span><h2>Peças do projeto</h2></div><span class="badge" id="row-count">0 ITENS</span></div><div class="pieces-description"><p>Medidas em <strong>milímetros (mm)</strong>. Marque os lados que recebem fita.</p></div><div id="pieces"></div><div class="add-area"><label for="piece-type" class="sr-only">Tipo de peça a adicionar</label><select id="piece-type">${TYPES.map(type => `<option>${type}</option>`).join('')}</select><button class="button primary" id="add-piece">${icon('plus')} Adicionar peça</button></div><div class="suggestions"><span>ADICIONE RAPIDAMENTE</span><div>${TYPES.map(type => `<button class="chip" data-add="${type}">${icon('plus')}${type}</button>`).join('')}</div></div></section></div>
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
    document.querySelector(`[data-total="${piece.id}"]`).textContent = money(row.total);
    document.querySelector(`[data-meters="${piece.id}"]`).textContent = `${decimal(row.meters)} m de fita`;
  });
  document.querySelector('#row-count').textContent = `${state.pieces.length} ${state.pieces.length === 1 ? 'ITEM' : 'ITENS'}`;
  persist();
}
function renderPieces() {
  document.querySelector('#pieces').innerHTML = state.pieces.length ? state.pieces.map((piece, index) => `<article class="piece" data-id="${piece.id}"><div class="piece-heading"><span class="piece-index">${String(index + 1).padStart(2, '0')}</span><label class="sr-only" for="type-${piece.id}">Tipo da peça ${index + 1}</label><select id="type-${piece.id}" data-field="type">${TYPES.map(type => `<option ${piece.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select><div class="piece-tools"><button class="icon-button" data-action="copy" aria-label="Duplicar ${piece.type}" title="Duplicar peça">${icon('copy')}</button><button class="icon-button danger" data-action="remove" aria-label="Remover ${piece.type}" title="Remover peça">${icon('trash')}</button></div></div><div class="dimensions">${[['width', 'Largura', 'mm'], ['height', 'Altura', 'mm'], ['quantity', 'Quantidade', 'un.']].map(([field, label, unit]) => `<label>${label}<div class="input-unit"><input type="number" data-field="${field}" aria-label="${label} da peça ${index + 1}" min="${field === 'quantity' ? 1 : 0}" step="1" value="${piece[field] || ''}" placeholder="0"><span>${unit}</span></div></label>`).join('')}</div><div class="piece-bottom"><fieldset><legend>FITA DE BORDA</legend><div class="edge-options">${[['top', 'Superior'], ['bottom', 'Inferior'], ['left', 'Esquerda'], ['right', 'Direita']].map(([side, label]) => `<label class="edge"><input type="checkbox" data-edge="${side}" ${piece.edges[side] ? 'checked' : ''}><span class="edge-glyph ${side}"></span>${label}</label>`).join('')}</div></fieldset><div class="piece-price"><strong data-total="${piece.id}"></strong><small data-meters="${piece.id}"></small></div></div>${!piece.width || !piece.height ? '<p class="measure-hint">Informe largura e altura para completar esta peça.</p>' : ''}</article>`).join('') : `<div class="empty-pieces"><span class="empty-drawing">▱</span><h3>Cada peça conta.</h3><p>Comece adicionando uma lateral, base ou prateleira.<br>Seu orçamento aparece conforme você preenche.</p></div>`;
  updateTotals();
}
function addPiece(type) { state.pieces.push(newPiece(type)); renderPieces(); const last = document.querySelector('#pieces .piece:last-child input[data-field="width"]'); last?.focus({ preventScroll: true }); }
document.querySelector('#add-piece').addEventListener('click', () => addPiece(document.querySelector('#piece-type').value));
document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addPiece(button.dataset.add)));
document.querySelector('#pieces').addEventListener('input', event => {
  const article = event.target.closest('[data-id]');
  if (!article) return;
  const piece = state.pieces.find(p => p.id === article.dataset.id);
  if (event.target.dataset.edge) piece.edges[event.target.dataset.edge] = event.target.checked;
  else if (event.target.dataset.field) {
    const field = event.target.dataset.field;
    piece[field] = field === 'type' ? event.target.value : Math.max(field === 'quantity' ? 1 : 0, Math.floor(Number(event.target.value) || 0));
  }
  const hint = article.querySelector('.measure-hint');
  if (piece.width && piece.height) hint?.remove();
  else if (!hint) article.insertAdjacentHTML('beforeend', '<p class="measure-hint">Informe largura e altura para completar esta peça.</p>');
  updateTotals();
});
document.querySelector('#pieces').addEventListener('change', event => { if (event.target.type === 'number') { const piece = state.pieces.find(p => p.id === event.target.closest('[data-id]').dataset.id); event.target.value = piece[event.target.dataset.field]; } });
document.querySelector('#pieces').addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const id = button.closest('[data-id]').dataset.id;
  const index = state.pieces.findIndex(p => p.id === id);
  if (button.dataset.action === 'remove') state.pieces.splice(index, 1);
  else state.pieces.splice(index + 1, 0, { ...state.pieces[index], id: crypto.randomUUID(), edges: { ...state.pieces[index].edges } });
  renderPieces();
});
document.querySelector('#project-name').addEventListener('input', event => { state.name = event.target.value; persist(); });
for (const [id, field] of [['cut-price', 'cut'], ['edge-price', 'edge']]) {
  document.querySelector(`#${id}`).addEventListener('input', event => { state[field] = Math.max(0, Number(event.target.value) || 0); updateTotals(); });
  document.querySelector(`#${id}`).addEventListener('change', event => { event.target.value = state[field]; });
}
function loadPhoto(file) {
  if (!file) return;
  const error = document.querySelector('#photo-error');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { error.textContent = 'Escolha uma imagem JPG, PNG ou WEBP de até 10 MB.'; return; }
  const candidate = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = candidate; photoName = file.name;
    document.querySelector('#photo').src = photoUrl;
    document.querySelector('#photo').hidden = false;
    document.querySelector('#photo-placeholder').hidden = true;
    document.querySelector('.photo-actions').hidden = false;
    document.querySelector('#photo-name').textContent = photoName;
    document.querySelector('#upload-zone').classList.add('has-photo');
    error.textContent = '';
  };
  image.onerror = () => { URL.revokeObjectURL(candidate); error.textContent = 'Não foi possível abrir esta imagem. Tente outro arquivo.'; };
  image.src = candidate;
}
document.querySelector('#photo-input').addEventListener('change', event => { loadPhoto(event.target.files[0]); event.target.value = ''; });
const upload = document.querySelector('#upload-zone');
for (const name of ['dragenter', 'dragover']) upload.addEventListener(name, event => { event.preventDefault(); upload.classList.add('dragging'); });
for (const name of ['dragleave', 'drop']) upload.addEventListener(name, event => { event.preventDefault(); upload.classList.remove('dragging'); if (name === 'drop') loadPhoto(event.dataTransfer.files[0]); });
document.querySelector('#remove-photo').addEventListener('click', () => {
  if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = ''; photoName = '';
  document.querySelector('#photo').hidden = true; document.querySelector('#photo').removeAttribute('src');
  document.querySelector('#photo-placeholder').hidden = false; document.querySelector('.photo-actions').hidden = true;
  upload.classList.remove('has-photo');
});
document.querySelector('#print').addEventListener('click', () => window.print());
renderPieces();

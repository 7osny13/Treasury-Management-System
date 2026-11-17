if (window.Chart) Chart.defaults.font.family = "'Readex Pro', system-ui, sans-serif";
// Treasury Management Application
// أيقونات مرسومة (نفس ستايل موقع العقارات)
const ICO = {
  in: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/></svg>',
  out: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>',
  swap: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/></svg>',
  note: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>',
  clock: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  edit: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  trash: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>',
};
// Phase D — Prevent Duplicate, Edit Transaction, Quick Search, Custom Icons

const DEFAULT_ACCOUNTS = {
  ahly:       { name: 'البنك الأهلي',            type: 'bank',   icon: '🏦' },
  masr:       { name: 'بنك مصر',                 type: 'bank',   icon: '🏦' },
  qatar:      { name: 'بنك قطر',                 type: 'bank',   icon: '🏦' },
  cib:        { name: 'البنك التجاري الدولي',     type: 'bank',   icon: '🏦' },
  alex_shimaa:{ name: 'بنك الإسكندرية - شيماء',  type: 'bank',   icon: '🏦' },
  alex_omar:  { name: 'بنك الإسكندرية - عمر',    type: 'bank',   icon: '🏦' },
  abudhabi:   { name: 'بنك أبوظبي',              type: 'bank',   icon: '🏦' },
  etisalat:   { name: 'محفظة اتصالات',           type: 'wallet', icon: '📱' },
  vodafone:   { name: 'محفظة فودافون',            type: 'wallet', icon: '📱' }
};

let ACCOUNTS = { ...DEFAULT_ACCOUNTS };
let appData  = { accounts: { ...DEFAULT_ACCOUNTS }, balances: {}, transactions: [] };
let filterState = { search: '', type: 'all', account: 'all', dateFrom: '', dateTo: '' };

// Statistics state
let statsMonth = new Date().getMonth();
let statsYear  = new Date().getFullYear();
let chartInstances = {};

// ① Duplicate prevention flag
let isSaving = false;

// نسخة البيانات المحمّلة (updated_at في Supabase) — للكشف عن تعديل من جهاز تاني
let dbVersion = null;
// لو التحميل فشل، ممنوع أي حفظ (علشان صفحة فاضية متكتبش فوق البيانات)
let loadOk = false;
let committing = false;

Object.keys(ACCOUNTS).forEach(k => { appData.balances[k] = 0; });

// Available icons for picker
const ICON_OPTIONS = ['🏦','🏧','💳','💰','📱','🏪','🏢','🏬','💵','💴','💶','💷','🪙','💎','🔐','📊','🏠','🚗','✈️','⭐'];

const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// =====================
// TOAST
// =====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'✅'}</span><span class="toast-message">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => { toast.classList.remove('toast-show'); toast.classList.add('toast-hide'); setTimeout(() => toast.remove(), 400); }, 3500);
}

function showConfirmToast(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `<div class="confirm-dialog"><p>${message}</p><div class="confirm-buttons"><button class="btn-confirm-yes">نعم، تأكيد</button><button class="btn-confirm-no">إلغاء</button></div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('confirm-show'));
    overlay.querySelector('.btn-confirm-yes').addEventListener('click', () => { overlay.remove(); resolve(true); });
    overlay.querySelector('.btn-confirm-no').addEventListener('click',  () => { overlay.remove(); resolve(false); });
  });
}

// تأكيد بكتابة كلمة — للعمليات اللي مش بترجع (حذف الكل / استيراد)
function showTypedConfirm(message, word) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `<div class="confirm-dialog"><p>${message}</p>
      <p style="margin-top:12px">للتأكيد اكتب: <b class="typed-word"></b></p>
      <input type="text" class="typed-input" autocomplete="off" style="width:100%;margin:8px 0 14px">
      <div class="confirm-buttons"><button class="btn-confirm-yes" disabled style="opacity:.45">تأكيد</button><button class="btn-confirm-no">إلغاء</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.typed-word').textContent = word;
    requestAnimationFrame(() => overlay.classList.add('confirm-show'));
    const yes = overlay.querySelector('.btn-confirm-yes'), input = overlay.querySelector('.typed-input');
    input.addEventListener('input', () => { const m = input.value.trim() === word; yes.disabled = !m; yes.style.opacity = m ? '1' : '.45'; });
    yes.addEventListener('click', () => { if (yes.disabled) return; overlay.remove(); resolve(true); });
    overlay.querySelector('.btn-confirm-no').addEventListener('click', () => { overlay.remove(); resolve(false); });
    setTimeout(() => input.focus(), 50);
  });
}

// =====================
// UTILS
// =====================
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num) || Math.abs(num) < 0.005) num = 0;
  // كسور حقيقية بس: 15000 → 15,000 — 2350.5 → 2,350.5 — 1234.56 → 1,234.56
  const [int, dec] = Number(num).toFixed(2).replace(/\.?0+$/, '').split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? '.' + dec : '');
}

// منع أي نص من المستخدم (ملاحظات / أسماء) إنه يتفسر كـ HTML
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// تاريخ بتوقيت الجهاز (مصر) بصيغة YYYY-MM-DD — بدل toISOString اللي بيستخدم UTC
function localDateStr(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

// تاريخ مختار من خانة التاريخ → وقت المعاملة:
// النهارده = الوقت الحالي، يوم سابق = الساعة 12 الظهر من اليوم ده
function txDateFromInput(value) {
  if (!value || value === localDateStr()) return new Date().toISOString();
  return new Date(`${value}T12:00:00`).toISOString();
}

function sortByDateDesc(list) {
  return list.slice().sort((a, b) => (new Date(b.date) - new Date(a.date)) || (b.id - a.id));
}

function showSyncStatus(msg, type) {
  const s = document.getElementById('syncStatus');
  s.textContent = msg; s.className = `sync-status ${type}`; s.style.display = 'block';
  setTimeout(() => { s.style.display = 'none'; }, 3000);
}

function generateAccountKey() {
  // كود داخلي ثابت — الاسم بيتخزن لوحده ويقدر يتغير في أي وقت
  return 'acc_' + Date.now();
}

function getAccountIcon(key) {
  return ACCOUNTS[key]?.icon || (ACCOUNTS[key]?.type === 'wallet' ? '📱' : '🏦');
}

// =====================
// DATABASE
// - الحسابات: عمود accounts في treasury_data (سطر id = 1)
// - المعاملات: جدول treasury_transactions — كل معاملة سطر
// - الأرصدة: بتتحسب من المعاملات (مش متخزنة)
// - updated_at في treasury_data = "نسخة" البيانات. أي حفظ بيتم عن طريق الدالة treasury_apply
//   اللي بتنفذ التعديل كله مرة واحدة، وبترفض لو جهاز تاني حفظ بعد ما الصفحة اتحملت
//   (وساعتها بنحمّل آخر نسخة ونعيد التعديل عليها).
// - عمود data القديم (الـ JSON الكبير) مبقاش بيتقرا ولا بيتكتب — نسخة احتياطية من يوم النقل.
// =====================
const TX_TABLE = 'treasury_transactions';
const TX_PAGE  = 1000;

function txFromRow(r) {
  return {
    id: Number(r.id), date: new Date(r.tx_date).toISOString(), type: r.type, notes: r.notes || '',
    amount: Number(r.amount), accountTo: r.account_to || null, accountFrom: r.account_from || null,
    fee: Number(r.fee) || 0, feeOn: Number(r.fee) > 0 ? (r.fee_on || 'from') : null
  };
}

function txToRow(t) {
  return {
    id: Number(t.id), type: t.type, amount: round2(t.amount),
    account_from: t.accountFrom || null, account_to: t.accountTo || null,
    notes: t.notes || '', tx_date: new Date(t.date).toISOString(),
    fee: round2(t.fee || 0), fee_on: round2(t.fee || 0) > 0 ? (t.feeOn || 'from') : null
  };
}

function computeBalances(accounts, transactions) {
  const d = { accounts, balances: {} };
  Object.keys(accounts).forEach(k => { d.balances[k] = 0; });
  transactions.forEach(t => applyEffects(d, t, +1));
  return d.balances;
}

// نفس الوقت؟ (المقارنة بالأرقام مش بالنص، علشان اختلاف صيغة الكتابة)
function sameVersion(a, b) {
  if (!a || !b) return a === b;
  return new Date(a).getTime() === new Date(b).getTime();
}

function normalizeData(raw) {
  const d = raw && typeof raw === 'object' ? JSON.parse(JSON.stringify(raw)) : {};
  const accounts = (d.accounts && Object.keys(d.accounts).length > 0) ? d.accounts : JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  Object.keys(accounts).forEach(k => {
    if (!accounts[k].icon) accounts[k].icon = accounts[k].type === 'wallet' ? '📱' : '🏦';
  });
  const transactions = Array.isArray(d.transactions) ? d.transactions : [];
  transactions.forEach(t => {   // ملفات قديمة من غير عمولة
    t.fee = round2(t.fee || 0);
    t.feeOn = t.fee > 0 ? (t.type === 'transfer' && t.feeOn === 'to' ? 'to' : 'from') : null;
  });
  return { accounts, balances: computeBalances(accounts, transactions), transactions };
}

function applyData(d, version) {
  appData = d;
  ACCOUNTS = d.accounts;
  dbVersion = version;
}

async function fetchMeta() {
  const { data, error } = await window.supabaseClient.from('treasury_data')
    .select('accounts,updated_at').eq('id', 1).limit(1);
  if (error) throw error;
  const row = data && data.length > 0 ? data[0] : null;
  if (!row || !row.accounts || !row.updated_at) throw new Error('بيانات الحسابات مش موجودة — اتأكد إن سكريبت النقل اتشغّل');
  return row;
}

async function fetchAllTx() {
  const all = [];
  for (let from = 0; ; ) {
    const { data, error } = await window.supabaseClient.from(TX_TABLE)
      .select('id,type,amount,account_from,account_to,notes,tx_date,fee,fee_on')
      .order('id', { ascending: false })
      .range(from, from + TX_PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    data.forEach(r => all.push(txFromRow(r)));
    from += data.length;
  }
  return all;
}

// تحميل كامل: الحسابات + كل المعاملات. لو حد حفظ في نص التحميل، نعيد.
async function loadState() {
  for (let i = 0; i < 3; i++) {
    const m1 = await fetchMeta();
    const transactions = await fetchAllTx();
    const m2 = await fetchMeta();
    if (sameVersion(m1.updated_at, m2.updated_at)) {
      return { data: normalizeData({ accounts: m2.accounts, transactions }), version: m2.updated_at };
    }
  }
  throw new Error('البيانات بتتغير أثناء التحميل — حاول تاني');
}

async function loadFromDatabase() {
  try {
    const s = await loadState();
    applyData(s.data, s.version);
    loadOk = true;
    updateUI();
    showSyncStatus('✅ تم التحميل', 'success');
    return true;
  } catch (e) {
    loadOk = false;
    console.error('Load error:', e);
    showToast('تعذر تحميل البيانات — مش هيتم حفظ أي تعديل لحد ما التحميل ينجح. اعمل تحديث للصفحة.', 'error');
    return false;
  }
}

// تحديث هادي لما ترجع للصفحة (مثلاً بعد ما حفظت من الموبايل)
async function refreshIfChanged() {
  if (!loadOk || committing || isSaving) return;
  if (document.querySelector('.modal-overlay.modal-show, .confirm-overlay')) return;
  try {
    const m = await fetchMeta();
    if (!sameVersion(m.updated_at, dbVersion)) {
      const s = await loadState();
      if (committing || isSaving) return;
      applyData(s.data, s.version);
      updateUI();
      if (document.getElementById('statistics')?.classList.contains('active')) updateStatisticsTab();
      showToast('تم تحديث البيانات بآخر تعديلات', 'info');
    }
  } catch (e) { console.warn('refresh failed', e); }
}

// op(d) بتعدّل نسخة البيانات d وترجع:
//   null / undefined = تمام
//   نص = رسالة خطأ (مفيش حفظ)
// replace = true: استبدال كل المعاملات (الاستيراد / حذف الكل)
async function commit(op, replace = false) {
  if (!loadOk) { showToast('البيانات لم تُحمّل بشكل صحيح — اعمل تحديث للصفحة قبل أي تعديل', 'error'); return false; }
  if (committing) return false;
  committing = true;
  let changedElsewhere = false;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      let meta;
      try { meta = await fetchMeta(); }
      catch (e) { console.error(e); showToast('تعذر الاتصال بقاعدة البيانات — لم يتم الحفظ', 'error'); return false; }

      // جهاز تاني حفظ → نحمّل آخر نسخة الأول، ونطبق التعديل عليها
      if (!sameVersion(meta.updated_at, dbVersion)) {
        try {
          const s = await loadState();
          applyData(s.data, s.version);
          updateUI();
          changedElsewhere = true;
        } catch (e) { console.error(e); showToast('تعذر تحميل آخر نسخة — لم يتم الحفظ', 'error'); return false; }
      }

      const base = JSON.parse(JSON.stringify(appData));
      const err = op(base);
      if (err) { showToast(err, 'warning'); return false; }

      // الفرق بين قبل وبعد: معاملات جديدة/متعدلة، ومعاملات اتحذفت
      let upsert = [], del = [];
      if (replace) {
        upsert = base.transactions.map(txToRow);
      } else {
        const before = new Map(appData.transactions.map(t => [t.id, JSON.stringify(txToRow(t))]));
        const after = new Set();
        base.transactions.forEach(t => {
          after.add(t.id);
          const row = txToRow(t);
          if (before.get(t.id) !== JSON.stringify(row)) upsert.push(row);
        });
        before.forEach((_, id) => { if (!after.has(id)) del.push(id); });
      }
      const accountsChanged = replace || JSON.stringify(base.accounts) !== JSON.stringify(appData.accounts);

      const { data: newVersion, error } = await window.supabaseClient.rpc('treasury_apply', {
        p_version: dbVersion,
        p_accounts: accountsChanged ? base.accounts : null,
        p_upsert: upsert,
        p_delete: del,
        p_replace: replace
      });
      if (error) {
        if (String(error.message || '').includes('TREASURY_CONFLICT')) continue; // جهاز تاني سبقنا — نعيد
        console.error(error);
        showToast('خطأ في الحفظ: ' + error.message, 'error');
        return false;
      }
      if (!newVersion) { showToast('لم يتم الحفظ — حاول مرة أخرى', 'error'); return false; }

      const saved = normalizeData(base);
      saved.transactions.sort((a, b) => b.id - a.id);
      applyData(saved, newVersion);
      updateUI();
      if (document.getElementById('statistics')?.classList.contains('active')) updateStatisticsTab();
      if (changedElsewhere) showToast('كان فيه تعديل من جهاز تاني — اتحفظ تعديلك فوق آخر نسخة', 'info');
      showSyncStatus('✅ تم الحفظ', 'success');
      return true;
    }
    showToast('البيانات بتتعدل من جهاز تاني في نفس اللحظة — حاول تاني', 'warning');
    return false;
  } finally {
    committing = false;
  }
}

// =====================
// BALANCE ENGINE — تأثير المعاملة على الأرصدة
// =====================
const round2 = x => Math.round((Number(x) || 0) * 100) / 100;

// العمولة: 'from' = بتتخصم من الحساب اللي طالع منه الفلوس فوق المبلغ
//          'to'   = بتتخصم من المبلغ الواصل (التحويل بس)
function txEffects(tx) {
  const amt = Number(tx.amount) || 0;
  const fee = tx.type === 'income' ? 0 : (Number(tx.fee) || 0);
  if (tx.type === 'income')  return [[tx.accountTo, +amt]];
  if (tx.type === 'expense') return [[tx.accountFrom, -(amt + fee)]];
  if (tx.feeOn === 'to')     return [[tx.accountFrom, -amt], [tx.accountTo, +(amt - fee)]];
  return [[tx.accountFrom, -(amt + fee)], [tx.accountTo, +amt]];
}

// تجهيز وفحص العمولة — بيرجّع {fee, feeOn} أو {error}
function cleanFee(type, amount, feeRaw, feeOnRaw) {
  const fee = round2(parseFloat(feeRaw) || 0);
  if (fee < 0) return { error: 'العمولة مينفعش تكون بالسالب' };
  if (type === 'income' || fee === 0) return { fee: 0, feeOn: null };
  const feeOn = type === 'transfer' && feeOnRaw === 'to' ? 'to' : 'from';
  if (feeOn === 'to' && fee >= amount) return { error: 'العمولة لازم تكون أقل من المبلغ المحوّل' };
  return { fee, feeOn };
}

// سطر بيوضح الخصم: هيتخصم كام من مين، وهيوصل كام لمين
function feeSummaryText(type, amount, fee, feeOn, fromKey, toKey) {
  if (type === 'income' || !(amount > 0)) return '';
  const fromN = esc(getAccountName(fromKey)), toN = esc(getAccountName(toKey));
  if (type === 'expense') {
    return fee > 0 ? `هيتخصم من ${fromN}: <b>${formatNumber(amount + fee)}</b> (${formatNumber(amount)} + عمولة ${formatNumber(fee)})` : '';
  }
  if (!(fee > 0)) return '';
  return feeOn === 'to'
    ? `هيتخصم من ${fromN}: <b>${formatNumber(amount)}</b> — هيوصل ${toN}: <b>${formatNumber(amount - fee)}</b> (بعد عمولة ${formatNumber(fee)})`
    : `هيتخصم من ${fromN}: <b>${formatNumber(amount + fee)}</b> (شامل عمولة ${formatNumber(fee)}) — هيوصل ${toN}: <b>${formatNumber(amount)}</b>`;
}

// sign = +1 تطبيق، -1 إلغاء. الحساب المحذوف (معاملات قديمة) بيتخطى بدل ما يبوظ الأرصدة
function applyEffects(d, tx, sign) {
  txEffects(tx).forEach(([k, delta]) => {
    if (!k || !d.accounts[k]) return;
    d.balances[k] = round2((d.balances[k] || 0) + sign * delta);
  });
}

// بعد التعديل: أي حساب نزل تحت الصفر ورصيده قلّ عن قبل كده = رفض
function checkNoNewNegative(d, before) {
  for (const k of Object.keys(before)) {
    const after = d.balances[k] || 0;
    if (after < -0.005 && after < before[k] - 0.005) {
      return `الرصيد غير كافي في "${d.accounts[k]?.name || k}" — الرصيد هيبقى ${formatNumber(after)} جنيه`;
    }
  }
  return null;
}

function snapshotBalances(d, txs) {
  const keys = new Set();
  txs.forEach(t => txEffects(t).forEach(([k]) => k && keys.add(k)));
  const snap = {};
  keys.forEach(k => { snap[k] = d.balances[k] || 0; });
  return snap;
}

function newTxId(d) {
  let id = Date.now();
  const used = new Set(d.transactions.map(t => t.id));
  while (used.has(id)) id++;
  return id;
}

function countAccountTx(d, key) {
  return d.transactions.filter(t => t.accountFrom === key || t.accountTo === key).length;
}

// =====================
// ACCOUNT MANAGEMENT
// =====================
function renderAccountsList() {
  const list = document.getElementById('accountsList');
  if (!list) return;
  const banks   = Object.entries(ACCOUNTS).filter(([,v]) => v.type === 'bank');
  const wallets = Object.entries(ACCOUNTS).filter(([,v]) => v.type === 'wallet');
  const renderGroup = (items, label) => {
    if (!items.length) return '';
    return `<div class="accounts-group"><h4 class="accounts-group-title">${label}</h4>
      ${items.map(([key, acc]) => {
        const bal = appData.balances[key] || 0;
        return `<div class="account-manage-item">
          <div class="account-manage-info">
            <span class="account-manage-icon">${acc.icon || (acc.type==='bank'?'🏦':'📱')}</span>
            <div>
              <div class="account-manage-name">${esc(acc.name)}</div>
              <div class="account-manage-balance ${bal!==0?'has-balance':''}">${formatNumber(bal)} جنيه</div>
            </div>
          </div>
          <div class="account-manage-actions">
            <button class="btn-edit-account" onclick="openEditAccount('${key}')">✏️ تعديل</button>
            <button class="btn-delete-account" onclick="deleteAccount('${key}')">🗑️ حذف</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  };
  list.innerHTML = renderGroup(banks,'🏦 البنوك') + renderGroup(wallets,'📱 المحافظ الإلكترونية');
}

function openAddAccount() {
  document.getElementById('accountModalTitle').textContent = 'إضافة حساب جديد';
  document.getElementById('accountNameInput').value = '';
  document.getElementById('accountTypeInput').value = 'bank';
  document.getElementById('accountEditKey').value = '';
  renderIconPicker('🏦');
  document.getElementById('accountModal').classList.add('modal-show');
}

function openEditAccount(key) {
  const acc = ACCOUNTS[key]; if (!acc) return;
  document.getElementById('accountModalTitle').textContent = 'تعديل الحساب';
  document.getElementById('accountNameInput').value = acc.name;
  document.getElementById('accountTypeInput').value = acc.type;
  document.getElementById('accountEditKey').value = key;
  renderIconPicker(acc.icon || (acc.type==='wallet'?'📱':'🏦'));
  document.getElementById('accountModal').classList.add('modal-show');
}

function renderIconPicker(selectedIcon) {
  const picker = document.getElementById('iconPicker');
  if (!picker) return;
  picker.innerHTML = ICON_OPTIONS.map(icon => `
    <button class="icon-option ${icon===selectedIcon?'selected':''}" onclick="selectIcon('${icon}')" type="button">${icon}</button>
  `).join('');
}

function selectIcon(icon) {
  document.getElementById('selectedIcon').value = icon;
  document.querySelectorAll('.icon-option').forEach(btn => {
    btn.classList.toggle('selected', btn.textContent === icon);
  });
}

function closeAccountModal() {
  document.getElementById('accountModal').classList.remove('modal-show');
}

async function saveAccount() {
  const name    = document.getElementById('accountNameInput').value.trim();
  const type    = document.getElementById('accountTypeInput').value;
  const icon    = document.getElementById('selectedIcon').value || (type==='wallet'?'📱':'🏦');
  const editKey = document.getElementById('accountEditKey').value;
  if (!name) { showToast('من فضلك أدخل اسم الحساب','warning'); return; }

  const ok = await commit(d => {
    if (Object.entries(d.accounts).find(([k,v]) => v.name === name && k !== editKey)) return 'يوجد حساب بنفس الاسم';
    if (editKey) {
      if (!d.accounts[editKey]) return 'الحساب غير موجود — ممكن يكون اتحذف من جهاز تاني';
      Object.assign(d.accounts[editKey], { name, type, icon });
    } else {
      const key = generateAccountKey();
      d.accounts[key] = { name, type, icon };
      d.balances[key] = 0;
    }
  });
  if (ok) {
    closeAccountModal();
    showToast(editKey ? `تم تعديل "${name}" بنجاح` : `تم إضافة "${name}" بنجاح`, 'success');
  }
}

async function deleteAccount(key) {
  const acc = ACCOUNTS[key]; if (!acc) return;
  const n = countAccountTx(appData, key);
  if (n > 0) {
    showToast(`مينفعش تحذف "${acc.name}" — عليه ${n} معاملة. الحذف هيبوّظ سجل المعاملات والأرصدة.`, 'warning');
    return;
  }
  const bal = appData.balances[key] || 0;
  const msg = Math.abs(bal) > 0.005
    ? `⚠️ حساب "${esc(acc.name)}" فيه رصيد ${formatNumber(bal)} جنيه. هل أنت متأكد من الحذف؟`
    : `هل تريد حذف حساب "${esc(acc.name)}"؟`;
  if (!await showConfirmToast(msg)) return;
  const ok = await commit(d => {
    if (!d.accounts[key]) return 'الحساب اتحذف بالفعل';
    if (countAccountTx(d, key) > 0) return 'الحساب عليه معاملات — مينفعش يتحذف';
    delete d.accounts[key]; delete d.balances[key];
  });
  if (ok) showToast(`تم حذف حساب "${acc.name}"`,'info');
}

// =====================
// UI UPDATE
// =====================
function updateUI() {
  updateDashboard();
  updateTransactionsList();
  updateReport();
  populateAccountSelects();
  renderAccountsList();
}

function updateDashboard() {
  const grid = document.getElementById('balanceGrid'); if (!grid) return;
  grid.innerHTML = '';
  let total=0, bankTotal=0, walletTotal=0;
  Object.keys(ACCOUNTS).forEach(key => {
    let bal = appData.balances[key];
    if (bal==null||isNaN(bal)) { bal=0; appData.balances[key]=0; }
    total+=Number(bal);
    if (ACCOUNTS[key].type==='bank') bankTotal+=Number(bal); else walletTotal+=Number(bal);
    const card = document.createElement('div');
    card.className = `balance-card ${ACCOUNTS[key].type==='wallet'?'wallet-card':''}`;
    card.innerHTML = `<div class="card-icon">${ACCOUNTS[key].icon || (ACCOUNTS[key].type==='bank'?'🏦':'📱')}</div><h3>${esc(ACCOUNTS[key].name)}</h3><div class="amount">${formatNumber(bal)} <span>جنيه</span></div>`;
    grid.appendChild(card);
  });
  const el = id => document.getElementById(id);
  if (el('totalBalance'))  el('totalBalance').textContent  = `${formatNumber(total)} جنيه`;
  if (el('bankTotal'))     el('bankTotal').textContent     = `${formatNumber(bankTotal)} جنيه`;
  if (el('walletTotal'))   el('walletTotal').textContent   = `${formatNumber(walletTotal)} جنيه`;
}

// =====================
// ② QUICK SEARCH (Dashboard)
// =====================
function doQuickSearch() {
  const q = document.getElementById('quickSearchInput')?.value?.trim().toLowerCase() || '';
  const resultsEl = document.getElementById('quickSearchResults');
  if (!q) { resultsEl.innerHTML = ''; resultsEl.style.display='none'; return; }

  const results = sortByDateDesc(appData.transactions).filter(t =>
    (t.notes && t.notes.toLowerCase().includes(q)) || t.amount.toString().includes(q)
  ).slice(0, 5);

  if (!results.length) {
    resultsEl.innerHTML = '<div class="qs-empty">لا توجد نتائج</div>';
    resultsEl.style.display = 'block';
    return;
  }

  resultsEl.innerHTML = results.map(t => {
    const date = new Date(t.date).toLocaleDateString('ar-EG');
    const typeIcon = ICO[t.type==='income'?'in':t.type==='expense'?'out':'swap'];
    return `<div class="qs-item" onclick="goToTransaction(${t.id})">
      <span class="qs-icon">${typeIcon}</span>
      <div class="qs-info">
        <span class="qs-amount">${formatNumber(t.amount)} جنيه</span>
        ${t.notes?`<span class="qs-notes">${esc(t.notes)}</span>`:''}
      </div>
      <span class="qs-date">${date}</span>
    </div>`;
  }).join('');
  resultsEl.style.display = 'block';
}

function goToTransaction(id) {
  document.getElementById('quickSearchInput').value = '';
  document.getElementById('quickSearchResults').style.display = 'none';
  // Switch to transactions tab and highlight
  showTab('transactions');
  filterState = { search:'', type:'all', account:'all', dateFrom:'', dateTo:'' };
  resetFilters();
  setTimeout(() => {
    const el = document.querySelector(`.transaction-item[data-id="${id}"]`);
    if (el) { el.scrollIntoView({ behavior:'smooth', block:'center' }); el.classList.add('highlight'); setTimeout(()=>el.classList.remove('highlight'),2000); }
  }, 200);
}

// =====================
// STATISTICS
// =====================
function updateStatisticsTab() {
  const label = document.getElementById('currentMonthLabel');
  if (label) label.textContent = `${MONTH_NAMES[statsMonth]} ${statsYear}`;

  const monthTx = appData.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth()===statsMonth && d.getFullYear()===statsYear;
  });

  let totalIncome=0, totalExpense=0, totalFees=0;
  monthTx.forEach(t => {
    if (t.type==='income')  totalIncome  += t.amount;
    if (t.type==='expense') totalExpense += t.amount;
    if (t.type!=='income')  totalFees    += (t.fee || 0);
  });
  const net = totalIncome - totalExpense - totalFees;   // العمولات فلوس خرجت فعلاً

  document.getElementById('kpiIncome').textContent  = `${formatNumber(totalIncome)} جنيه`;
  document.getElementById('kpiExpense').textContent = `${formatNumber(totalExpense)} جنيه`;
  const netEl = document.getElementById('kpiNet');
  netEl.textContent = `${formatNumber(net)} جنيه`;
  netEl.style.color = net >= 0 ? '#28a745' : '#dc3545';
  document.getElementById('kpiCount').textContent = monthTx.length;
  const feesEl = document.getElementById('kpiFees');
  if (feesEl) feesEl.textContent = `${formatNumber(totalFees)} جنيه`;

  const incomeByAcc = {}, expenseByAcc = {};
  monthTx.forEach(t => {
    if (t.type==='income'  && t.accountTo)   incomeByAcc[t.accountTo]   = (incomeByAcc[t.accountTo]  ||0)+t.amount;
    if (t.type==='expense' && t.accountFrom) expenseByAcc[t.accountFrom]= (expenseByAcc[t.accountFrom]||0)+t.amount;
  });
  const topInc = Object.entries(incomeByAcc).sort((a,b)=>b[1]-a[1])[0];
  const topExp = Object.entries(expenseByAcc).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('topIncomeAccount').innerHTML  = topInc ? `<strong>${esc(ACCOUNTS[topInc[0]]?.name||topInc[0])}</strong><span>${formatNumber(topInc[1])} جنيه</span>` : '<span>لا توجد بيانات</span>';
  document.getElementById('topExpenseAccount').innerHTML = topExp ? `<strong>${esc(ACCOUNTS[topExp[0]]?.name||topExp[0])}</strong><span>${formatNumber(topExp[1])} جنيه</span>` : '<span>لا توجد بيانات</span>';

  renderMonthlyCompareChart();
  renderBalanceTrendChart();
  renderBalanceDistChart();
  renderTypeDistChart();
  renderAccountsBarChart(monthTx);
}

function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function renderMonthlyCompareChart() {
  destroyChart('monthlyCompare');
  const labels=[], incomes=[], expenses=[];
  for (let i=5; i>=0; i--) {
    let m = statsMonth - i; let y = statsYear;
    if (m < 0) { m += 12; y -= 1; }
    labels.push(`${MONTH_NAMES[m].substring(0,3)} ${y}`);
    const tx = appData.transactions.filter(t => { const d=new Date(t.date); return d.getMonth()===m && d.getFullYear()===y; });
    incomes.push(tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    expenses.push(tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
  }
  const ctx = document.getElementById('monthlyCompareChart').getContext('2d');
  chartInstances['monthlyCompare'] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'إيداعات', data: incomes,  backgroundColor: 'rgba(26,138,95,0.8)',  borderColor: '#1a8a5f', borderWidth: 2, borderRadius: 6 },
      { label: 'سحوبات',  data: expenses, backgroundColor: 'rgba(214,69,61,0.8)', borderColor: '#d6453d', borderWidth: 2, borderRadius: 6 }
    ]},
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } } } }
  });
}

function renderBalanceTrendChart() {
  destroyChart('balanceTrend');
  const sorted = [...appData.transactions].sort((a,b)=>new Date(a.date)-new Date(b.date));
  let running = 0;
  const points = [];
  sorted.forEach(t => {
    if (t.type==='income')  running += t.amount;
    if (t.type==='expense') running -= t.amount;
    if (t.type!=='income')  running -= (t.fee || 0);
    points.push({ x: new Date(t.date).toLocaleDateString('ar-EG'), y: running });
  });
  const step = Math.max(1, Math.floor(points.length/30));
  const sampled = points.filter((_,i)=>i%step===0 || i===points.length-1);
  const ctx = document.getElementById('balanceTrendChart').getContext('2d');
  chartInstances['balanceTrend'] = new Chart(ctx, {
    type: 'line',
    data: { labels: sampled.map(p=>p.x), datasets: [{ label: 'الرصيد الإجمالي', data: sampled.map(p=>p.y), borderColor: '#0b5563', backgroundColor: 'rgba(18,163,168,0.12)', fill: true, tension: 0.4, pointRadius: sampled.length < 15 ? 4 : 2, borderWidth: 2 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => formatNumber(v) } }, x: { ticks: { maxRotation: 45 } } } }
  });
}

function renderBalanceDistChart() {
  destroyChart('balanceDist');
  const keys   = Object.keys(ACCOUNTS).filter(k => (appData.balances[k]||0) > 0);
  const labels = keys.map(k => ACCOUNTS[k].name);
  const values = keys.map(k => appData.balances[k]||0);
  const colors = ['#0b5563','#12a3a8','#ef6f4f','#1a8a5f','#2471a3','#d6453d','#f2a541','#7fc8c9','#8a6fb0','#8a9ea2'];
  if (!values.length) { document.getElementById('balanceDistChart').parentElement.innerHTML='<p class="empty-state">لا يوجد رصيد</p>'; return; }
  const ctx = document.getElementById('balanceDistChart').getContext('2d');
  chartInstances['balanceDist'] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0,values.length), borderWidth: 2 }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });
}

function renderTypeDistChart() {
  destroyChart('typeDist');
  const monthTx = appData.transactions.filter(t => { const d=new Date(t.date); return d.getMonth()===statsMonth && d.getFullYear()===statsYear; });
  const inc = monthTx.filter(t=>t.type==='income').length;
  const exp = monthTx.filter(t=>t.type==='expense').length;
  const tra = monthTx.filter(t=>t.type==='transfer').length;
  if (!monthTx.length) { document.getElementById('typeDistChart').parentElement.innerHTML='<p class="empty-state">لا توجد معاملات هذا الشهر</p>'; return; }
  const ctx = document.getElementById('typeDistChart').getContext('2d');
  chartInstances['typeDist'] = new Chart(ctx, {
    type: 'pie',
    data: { labels: ['إيداع','سحب','تحويل'], datasets: [{ data: [inc,exp,tra], backgroundColor: ['#1a8a5f','#d6453d','#0b5563'], borderWidth: 2 }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderAccountsBarChart(monthTx) {
  destroyChart('accountsBar');
  const keys     = Object.keys(ACCOUNTS);
  const incomes  = keys.map(k => monthTx.filter(t=>t.type==='income' && t.accountTo===k).reduce((s,t)=>s+t.amount,0));
  const expenses = keys.map(k => monthTx.filter(t=>t.type==='expense'&& t.accountFrom===k).reduce((s,t)=>s+t.amount,0));
  const labels   = keys.map(k => ACCOUNTS[k].name);
  const ctx = document.getElementById('accountsBarChart').getContext('2d');
  chartInstances['accountsBar'] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'إيداعات', data: incomes,  backgroundColor: 'rgba(26,138,95,0.8)',  borderRadius: 5 },
      { label: 'سحوبات',  data: expenses, backgroundColor: 'rgba(214,69,61,0.8)', borderRadius: 5 }
    ]},
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } }, x: { ticks: { maxRotation: 30, font: { size: 11 } } } } }
  });
}

// =====================
// SEARCH & FILTER
// =====================
function applyFilters() {
  filterState.search  = document.getElementById('searchInput')?.value?.trim().toLowerCase()||'';
  filterState.type    = document.getElementById('filterType')?.value||'all';
  filterState.account = document.getElementById('filterAccount')?.value||'all';
  filterState.dateFrom= document.getElementById('filterDateFrom')?.value||'';
  filterState.dateTo  = document.getElementById('filterDateTo')?.value||'';
  renderFilteredTransactions();
}

function resetFilters() {
  ['searchInput','filterDateFrom','filterDateTo'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['filterType','filterAccount'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='all';});
  filterState = { search:'', type:'all', account:'all', dateFrom:'', dateTo:'' };
  renderFilteredTransactions();
}

function getFilteredTransactions() {
  return sortByDateDesc(appData.transactions).filter(t => {
    if (filterState.search) {
      if (!(t.notes&&t.notes.toLowerCase().includes(filterState.search)) && !t.amount.toString().includes(filterState.search)) return false;
    }
    if (filterState.type!=='all' && t.type!==filterState.type) return false;
    if (filterState.account!=='all' && t.accountFrom!==filterState.account && t.accountTo!==filterState.account) return false;
    if (filterState.dateFrom && localDateStr(t.date) < filterState.dateFrom) return false;
    if (filterState.dateTo   && localDateStr(t.date) > filterState.dateTo)   return false;
    return true;
  });
}

function getAccountName(key) { return ACCOUNTS[key]?.name || key || ''; }

function renderFilteredTransactions() {
  const list    = document.getElementById('transactionsList');
  const filtered= getFilteredTransactions();
  const countEl = document.getElementById('transactionsCount');
  if (countEl) countEl.textContent = `${filtered.length} معاملة من أصل ${appData.transactions.length}`;
  if (!filtered.length) { list.innerHTML='<p class="empty-state">لا توجد معاملات تطابق البحث</p>'; return; }

  // 5000+ معاملة في صفحة واحدة بتتقل الموبايل — نعرض أحدث 300 والباقي بالبحث والفلترة
  const LIMIT = 300;
  const shown = filtered.slice(0, LIMIT);
  const more = filtered.length > LIMIT
    ? `<p class="empty-state">معروض أحدث ${LIMIT} من ${filtered.length} — استخدم البحث أو التاريخ للوصول لمعاملات أقدم</p>` : '';

  list.innerHTML = more + shown.map(t => {
    const date    = new Date(t.date);
    const dateStr = date.toLocaleDateString('ar-EG')+' '+date.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
    let typeText='', details='', typeClass='';
    if (t.type==='income')       { typeText=ICO.in+' إيداع';  typeClass='type-income';   details=`إلى: ${esc(getAccountName(t.accountTo))}`; }
    else if (t.type==='expense') { typeText=ICO.out+' سحب';    typeClass='type-expense';  details=`من: ${esc(getAccountName(t.accountFrom))}`; }
    else                         { typeText=ICO.swap+' تحويل';  typeClass='type-transfer'; details=`من: ${esc(getAccountName(t.accountFrom))} ← إلى: ${esc(getAccountName(t.accountTo))}`; }
    return `<div class="transaction-item ${t.type}" data-id="${t.id}">
      <div class="transaction-header">
        <span class="transaction-type ${typeClass}">${typeText}</span>
        <span class="transaction-amount">${formatNumber(t.amount)} جنيه</span>
      </div>
      <div class="transaction-details">${details}</div>
      ${t.fee>0?`<div class="transaction-fee">عمولة ${formatNumber(t.fee)} جنيه — ${t.type==='transfer'&&t.feeOn==='to'
          ? `اتخصمت من المبلغ الواصل (وصل ${esc(getAccountName(t.accountTo))} ${formatNumber(t.amount-t.fee)})`
          : `اتخصمت من ${esc(getAccountName(t.accountFrom))} (الإجمالي ${formatNumber(t.amount+t.fee)})`}</div>`:''}
      ${t.notes?`<div class="transaction-notes">${ICO.note} ${esc(t.notes)}</div>`:''}
      <div class="transaction-footer">
        <span class="transaction-date">${ICO.clock} ${dateStr}</span>
        <div class="transaction-actions">
          <button class="edit-btn" onclick="openEditTransaction(${t.id})">${ICO.edit} تعديل</button>
          <button class="delete-btn" onclick="deleteTransaction(${t.id})">${ICO.trash} حذف</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function updateTransactionsList() { populateFilterAccountSelect(); renderFilteredTransactions(); }

function populateFilterAccountSelect() {
  const sel = document.getElementById('filterAccount'); if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="all">كل الحسابات</option>';
  Object.keys(ACCOUNTS).forEach(key => {
    const opt=document.createElement('option'); opt.value=key; opt.textContent=ACCOUNTS[key].name;
    if (key===cur) opt.selected=true; sel.appendChild(opt);
  });
}

// =====================
// ③ EDIT TRANSACTION
// =====================
function openEditTransaction(id) {
  const t = appData.transactions.find(x => x.id === id);
  if (!t) return;

  const modal = document.getElementById('editTransactionModal');
  document.getElementById('editTxId').value = t.id;
  document.getElementById('editTxAmount').value = t.amount;
  document.getElementById('editTxNotes').value = t.notes || '';
  const dateEl = document.getElementById('editTxDate');
  dateEl.value = localDateStr(t.date);
  dateEl.max = localDateStr();
  dateEl.dataset.original = localDateStr(t.date);

  const typeLabels = { income: ICO.in+' إيداع', expense: ICO.out+' سحب', transfer: ICO.swap+' تحويل' };
  document.getElementById('editTxTypeLabel').innerHTML = typeLabels[t.type] || esc(t.type);

  let accountInfo = '';
  if (t.type === 'income')   accountInfo = `إلى: ${getAccountName(t.accountTo)}`;
  else if (t.type === 'expense')  accountInfo = `من: ${getAccountName(t.accountFrom)}`;
  else accountInfo = `من: ${getAccountName(t.accountFrom)} ← إلى: ${getAccountName(t.accountTo)}`;
  document.getElementById('editTxAccountInfo').textContent = accountInfo;

  modal.dataset.type = t.type;
  modal.dataset.from = t.accountFrom || '';
  modal.dataset.to   = t.accountTo || '';
  document.getElementById('editFeeGroup').style.display   = t.type==='income' ? 'none' : 'block';
  document.getElementById('editFeeOnGroup').style.display = t.type==='transfer' ? 'flex' : 'none';
  document.getElementById('editTxFee').value = t.fee > 0 ? t.fee : '';
  document.querySelectorAll('input[name="editFeeOn"]').forEach(r => { r.checked = r.value === (t.feeOn === 'to' ? 'to' : 'from'); });
  updateEditFeeSummary();

  modal.classList.add('modal-show');
}

function updateEditFeeSummary() {
  const modal = document.getElementById('editTransactionModal');
  const el = document.getElementById('editFeeSummary'); if (!el) return;
  const type = modal.dataset.type;
  const amount = round2(parseFloat(document.getElementById('editTxAmount').value));
  const f = cleanFee(type, amount, document.getElementById('editTxFee').value, document.querySelector('input[name="editFeeOn"]:checked')?.value);
  el.innerHTML = f.error ? `<span class="fee-error">${f.error}</span>` : feeSummaryText(type, amount, f.fee, f.feeOn, modal.dataset.from, modal.dataset.to);
}

function closeEditTransactionModal() {
  document.getElementById('editTransactionModal').classList.remove('modal-show');
}

async function saveEditTransaction() {
  const id        = parseInt(document.getElementById('editTxId').value);
  const newAmount = round2(parseFloat(document.getElementById('editTxAmount').value));
  const newNotes  = document.getElementById('editTxNotes').value;
  const dateEl    = document.getElementById('editTxDate');
  const newDay    = dateEl.value;

  if (!newAmount || newAmount <= 0) { showToast('من فضلك أدخل مبلغ صحيح','warning'); return; }
  if (!newDay) { showToast('من فضلك اختر التاريخ','warning'); return; }
  if (newDay > localDateStr()) { showToast('مينفعش تاريخ في المستقبل','warning'); return; }
  const txType = document.getElementById('editTransactionModal').dataset.type;
  const f = cleanFee(txType, newAmount, document.getElementById('editTxFee').value, document.querySelector('input[name="editFeeOn"]:checked')?.value);
  if (f.error) { showToast(f.error,'warning'); return; }

  const ok = await commit(d => {
    const t = d.transactions.find(x => x.id === id);
    if (!t) return 'المعاملة غير موجودة — ممكن تكون اتحذفت من جهاز تاني';
    const before = snapshotBalances(d, [t]);
    applyEffects(d, t, -1);
    t.amount = newAmount;
    t.notes  = newNotes;
    t.fee    = f.fee;
    t.feeOn  = f.feeOn;
    if (newDay !== dateEl.dataset.original) t.date = txDateFromInput(newDay);
    applyEffects(d, t, +1);
    return checkNoNewNegative(d, before);
  });
  if (ok) { closeEditTransactionModal(); showToast('تم تعديل المعاملة بنجاح','success'); }
}

// =====================
// REPORT
// =====================
function updateReport() {
  const today = new Date().toLocaleDateString('ar-EG');
  let total=0;
  Object.keys(ACCOUNTS).forEach(k=>{ const b=appData.balances[k]; if(b!=null&&!isNaN(b)) total+=Number(b); });
  let html=`<div class="total-balance"><h2>التقرير اليومي — ${today}</h2><div class="amount">${formatNumber(total)} جنيه</div></div>
    <div class="report-section"><h3>🏦 الحسابات البنكية</h3>`;
  Object.keys(ACCOUNTS).forEach(k=>{ if(ACCOUNTS[k].type==='bank') html+=`<div class="report-item"><span>${ACCOUNTS[k].icon||'🏦'} ${esc(ACCOUNTS[k].name)}</span><strong>${formatNumber(appData.balances[k]||0)} جنيه</strong></div>`; });
  html+=`</div><div class="report-section"><h3>📱 المحافظ الإلكترونية</h3>`;
  Object.keys(ACCOUNTS).forEach(k=>{ if(ACCOUNTS[k].type==='wallet') html+=`<div class="report-item"><span>${ACCOUNTS[k].icon||'📱'} ${esc(ACCOUNTS[k].name)}</span><strong>${formatNumber(appData.balances[k]||0)} جنيه</strong></div>`; });
  html+=`</div>`;
  const el=document.getElementById('reportContent'); if(el) el.innerHTML=html;
}

// =====================
// FORM FUNCTIONS
// =====================
function updateFormFields() {
  const type=document.getElementById('transactionType').value;
  const fg=document.getElementById('accountFromGroup'), tg=document.getElementById('accountToGroup');
  if (type==='income')       { fg.style.display='none';  tg.style.display='block'; document.querySelector('#accountToGroup label').textContent='إلى الحساب'; }
  else if (type==='expense') { fg.style.display='block'; tg.style.display='none';  document.querySelector('#accountFromGroup label').textContent='من الحساب'; }
  else                       { fg.style.display='block'; tg.style.display='block'; }
  document.getElementById('feeGroup').style.display   = type==='income' ? 'none' : 'block';
  document.getElementById('feeOnGroup').style.display = type==='transfer' ? 'flex' : 'none';
  updateFeeSummary();
}

function updateFeeSummary() {
  const el = document.getElementById('feeSummary'); if (!el) return;
  const type = document.getElementById('transactionType').value;
  const amount = round2(parseFloat(document.getElementById('amount').value));
  const feeOn = document.querySelector('input[name="feeOn"]:checked')?.value;
  const f = cleanFee(type, amount, document.getElementById('fee').value, feeOn);
  el.innerHTML = f.error ? `<span class="fee-error">${f.error}</span>`
    : feeSummaryText(type, amount, f.fee, f.feeOn, document.getElementById('accountFrom').value, document.getElementById('accountTo').value);
}

function populateAccountSelects() {
  const fs=document.getElementById('accountFrom'), ts=document.getElementById('accountTo'); if(!fs||!ts) return;
  const fv=fs.value, tv=ts.value;
  fs.innerHTML=''; ts.innerHTML='';
  Object.keys(ACCOUNTS).forEach(key=>{
    const o=document.createElement('option'); o.value=key; o.textContent=`${ACCOUNTS[key].icon||''} ${ACCOUNTS[key].name}`;
    if(key===fv) o.selected=true; fs.appendChild(o);
    const o2=o.cloneNode(true); if(key===tv) o2.selected=true; ts.appendChild(o2);
  });
}

// =====================
// ① TRANSACTIONS — PREVENT DUPLICATE
// =====================
async function addTransaction() {
  // Prevent double-tap / double-click
  if (isSaving) return;

  const type=document.getElementById('transactionType').value;
  const amount=round2(parseFloat(document.getElementById('amount').value));
  const notes=document.getElementById('notes').value;
  const accountFrom=document.getElementById('accountFrom').value;
  const accountTo=document.getElementById('accountTo').value;
  const day=document.getElementById('txDate').value || localDateStr();

  if (!amount||amount<=0) { showToast('من فضلك أدخل مبلغ صحيح','warning'); return; }
  if (type==='transfer'&&accountFrom===accountTo) { showToast('لا يمكن التحويل إلى نفس الحساب','warning'); return; }
  if (day > localDateStr()) { showToast('مينفعش تاريخ في المستقبل','warning'); return; }
  const f = cleanFee(type, amount, document.getElementById('fee').value, document.querySelector('input[name="feeOn"]:checked')?.value);
  if (f.error) { showToast(f.error,'warning'); return; }

  isSaving = true;
  const btn = document.getElementById('addTransactionBtn');
  const originalText = btn.innerHTML;
  btn.textContent = 'جاري الحفظ...';
  btn.disabled = true;

  const saved = await commit(d => {
    const tx = {
      id: newTxId(d), type, amount, notes,
      accountFrom: type!=='income'?accountFrom:null,
      accountTo:   type!=='expense'?accountTo:null,
      date: txDateFromInput(day),
      fee: f.fee, feeOn: f.feeOn
    };
    for (const k of [tx.accountFrom, tx.accountTo].filter(Boolean)) {
      if (!d.accounts[k]) return 'الحساب المختار غير موجود — ممكن يكون اتحذف من جهاز تاني';
    }
    const before = snapshotBalances(d, [tx]);
    applyEffects(d, tx, +1);
    const err = checkNoNewNegative(d, before);
    if (err) return err;
    d.transactions.unshift(tx);
  });

  if (saved) {
    document.getElementById('amount').value=''; document.getElementById('notes').value='';
    document.getElementById('fee').value=''; updateFeeSummary();
    document.getElementById('txDate').value = localDateStr();
    showToast(day === localDateStr() ? 'تم حفظ المعاملة بنجاح' : `تم حفظ المعاملة بتاريخ ${new Date(day + 'T12:00:00').toLocaleDateString('ar-EG')}`,'success');
    showTab('dashboard');
  }
  resetSaveBtn(btn, originalText);
}

function resetSaveBtn(btn, text) {
  setTimeout(() => {
    isSaving = false;
    btn.innerHTML = text;
    btn.disabled = false;
  }, 1000);
}

async function deleteTransaction(id) {
  const t=appData.transactions.find(x=>x.id===id); if(!t) return;
  // تحذير لو الحذف هيخلي حساب بالسالب (مثلاً حذف إيداع اتصرف منه)
  const preview = JSON.parse(JSON.stringify({ accounts: appData.accounts, balances: appData.balances }));
  applyEffects(preview, t, -1);
  const neg = txEffects(t).map(([k]) => k).filter(k => k && preview.accounts[k] && preview.balances[k] < -0.005);
  const warn = neg.length ? `<br><br>⚠️ رصيد ${neg.map(k => `"${esc(preview.accounts[k].name)}"`).join(' و ')} هيبقى بالسالب (${neg.map(k => formatNumber(preview.balances[k])).join(' / ')} جنيه).` : '';
  if (!await showConfirmToast(`هل تريد حذف هذه المعاملة؟<br><b>${formatNumber(t.amount)} جنيه</b>${t.notes ? ` — ${esc(t.notes)}` : ''}${warn}`)) return;
  const ok = await commit(d => {
    const x = d.transactions.find(y => y.id === id);
    if (!x) return 'المعاملة اتحذفت بالفعل';
    applyEffects(d, x, -1);
    d.transactions = d.transactions.filter(y => y.id !== id);
  });
  if (ok) showToast('تم حذف المعاملة','info');
}

// =====================
// REPORT SHARE
// =====================
function shareReport() {
  const today=new Date().toLocaleDateString('ar-EG');
  const total=Object.keys(ACCOUNTS).reduce((s,k)=>s+(Number(appData.balances[k])||0),0);
  let msg=`📊 *التقرير اليومي*\n📅 ${today}\n━━━━━━━━━━━━━━━━━━━━\n\n💰 *إجمالي الرصيد:*\n${formatNumber(total)} جنيه\n\n━━━━━━━━━━━━━━━━━━━━\n\n🏦 *الحسابات البنكية:*\n\n`;
  Object.keys(ACCOUNTS).forEach(k=>{ if(ACCOUNTS[k].type==='bank') msg+=`▪️ ${ACCOUNTS[k].name}\n ${formatNumber(appData.balances[k])} جنيه\n\n`; });
  msg+=`━━━━━━━━━━━━━━━━━━━━\n\n📱 *المحافظ الإلكترونية:*\n\n`;
  Object.keys(ACCOUNTS).forEach(k=>{ if(ACCOUNTS[k].type==='wallet') msg+=`▪️ ${ACCOUNTS[k].name}\n ${formatNumber(appData.balances[k])} جنيه\n\n`; });
  msg+=`━━━━━━━━━━━━━━━━━━━━`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank');
}

// =====================
// BACKUP
// =====================
function exportData() {
  const payload = { ...appData, exported_at: new Date().toISOString() };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=`treasury_backup_${localDateStr()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast(`تم تصدير ${appData.transactions.length} معاملة و ${Object.keys(ACCOUNTS).length} حساب`,'success');
}

async function importData() {
  const file=document.getElementById('importFile').files[0];
  if (!file) { showToast('من فضلك اختر ملف','warning'); return; }
  const reader=new FileReader();
  reader.onload=async e=>{
    let imp;
    try { imp = JSON.parse(e.target.result); } catch { showToast('الملف مش نسخة احتياطية صحيحة','error'); return; }
    if (!imp || typeof imp !== 'object' || !Array.isArray(imp.transactions) || typeof imp.balances !== 'object' || typeof imp.accounts !== 'object') {
      showToast('الملف مش نسخة احتياطية من الخزينة — مفيهوش حسابات ومعاملات','error'); return;
    }
    const clean = normalizeData(imp);
    // فحص المعاملات قبل أي حاجة — نفس شروط الجدول في Supabase
    const ids = new Set();
    const bad = clean.transactions.find(t => {
      const okType = t.type === 'income' ? !!t.accountTo : t.type === 'expense' ? !!t.accountFrom
                   : t.type === 'transfer' ? !!(t.accountFrom && t.accountTo) : false;
      const okId = Number.isSafeInteger(Number(t.id)) && !ids.has(Number(t.id)); ids.add(Number(t.id));
      const okFee = !(t.fee > 0) || (t.type !== 'income' && (t.feeOn !== 'to' || t.fee < t.amount));
      return !okType || !okId || !okFee || !(Number(t.amount) > 0) || isNaN(new Date(t.date).getTime());
    });
    if (bad) { showToast('الملف فيه معاملة ناقصة أو مكررة — الاستيراد اتلغى', 'error'); console.warn('bad tx', bad); return; }
    // الأرصدة بتتحسب من المعاملات — لو الملف فيه أرصدة مختلفة، ننبه
    const diffAcc = Object.keys(clean.accounts).filter(k => imp.balances[k] != null && Math.abs(Number(imp.balances[k]) - clean.balances[k]) > 0.01);
    const balWarn = diffAcc.length ? `<br><br>⚠️ أرصدة ${diffAcc.map(k => `"${esc(clean.accounts[k].name)}"`).join(' و ')} في الملف مختلفة عن مجموع معاملاتها — الموقع هيعتمد مجموع المعاملات.` : '';
    const msg = `الملف فيه <b>${clean.transactions.length}</b> معاملة و <b>${Object.keys(clean.accounts).length}</b> حساب.<br>` +
      `هيتم استبدال البيانات الحالية بالكامل (<b>${appData.transactions.length}</b> معاملة).<br>أي معاملة اتسجلت بعد تاريخ الملف هتضيع.` + balWarn;
    if (!await showTypedConfirm(msg, 'استبدال')) return;
    const ok = await commit(d => {
      Object.keys(d).forEach(k => delete d[k]);
      Object.assign(d, clean);
    }, true);
    if (ok) { showToast('تم الاستيراد بنجاح','success'); showTab('dashboard'); }
  };
  reader.readAsText(file);
}

async function clearAllData() {
  const msg = `⚠️ سيتم حذف <b>${appData.transactions.length}</b> معاملة وكل الأرصدة نهائياً.<br>نزّل نسخة احتياطية الأول من "تصدير البيانات".`;
  if (!await showTypedConfirm(msg, 'حذف الكل')) return;
  const ok = await commit(d => {
    const fresh = normalizeData({ accounts: JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)) });
    Object.keys(d).forEach(k => delete d[k]);
    Object.assign(d, fresh);
  }, true);
  if (ok) { showToast('تم حذف جميع البيانات','info'); showTab('dashboard'); }
}

// =====================
// TAB NAVIGATION
// =====================
function showTab(tabName) {
  // التبويبات فوق (اللاب) + الشريط تحت (الموبايل)
  document.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active', t.getAttribute('data-tab')===tabName));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  window.scrollTo(0, 0);
  if (tabName==='statistics') updateStatisticsTab();
}

// =====================
// INIT
// =====================
async function init() {
  console.log('Initializing...');
  await loadFromDatabase();
  const txDate = document.getElementById('txDate');
  if (txDate) { txDate.value = localDateStr(); txDate.max = localDateStr(); }
  populateAccountSelects();
  updateFormFields();
  updateUI();
  setupEventListeners();
  console.log('Ready');
}

function setupEventListeners() {
  document.querySelectorAll('[data-tab]').forEach(tab=>{
    tab.addEventListener('click', function(){ showTab(this.getAttribute('data-tab')); });
  });
  document.getElementById('transactionType').addEventListener('change', updateFormFields);
  ['amount','fee'].forEach(id => document.getElementById(id).addEventListener('input', updateFeeSummary));
  ['accountFrom','accountTo'].forEach(id => document.getElementById(id).addEventListener('change', updateFeeSummary));
  document.querySelectorAll('input[name="feeOn"]').forEach(r => r.addEventListener('change', updateFeeSummary));
  ['editTxAmount','editTxFee'].forEach(id => document.getElementById(id).addEventListener('input', updateEditFeeSummary));
  document.querySelectorAll('input[name="editFeeOn"]').forEach(r => r.addEventListener('change', updateEditFeeSummary));

  // شريط التنقل تحت: كروم على الآيفون أحياناً بيغطي جزء منه لحد ما تعمل scroll
  // (الصفحة فاكرة إنها أطول من الجزء الظاهر) — بنرفعه بقيمة الجزء المستخبي
  const vv = window.visualViewport;
  const fixBottomNav = () => {
    const nav = document.querySelector('.bottom-nav');
    if (!nav || !vv) return;
    const hidden = Math.round(document.documentElement.clientHeight - (vv.height + vv.offsetTop));
    nav.style.transform = hidden > 1 && vv.scale < 1.05 ? `translateY(-${hidden}px)` : '';
  };
  if (vv) { vv.addEventListener('resize', fixBottomNav); vv.addEventListener('scroll', fixBottomNav); }
  window.addEventListener('resize', fixBottomNav);
  window.addEventListener('pageshow', fixBottomNav);
  window.addEventListener('orientationchange', () => setTimeout(fixBottomNav, 300));
  setTimeout(fixBottomNav, 0); setTimeout(fixBottomNav, 600);

  // ?debug=1 → لوحة قياسات صغيرة فوق (لتشخيص شريط التنقل على كروم الآيفون)
  if (/[?&]debug=1/.test(location.search)) {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden';
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;top:70px;left:8px;right:8px;z-index:99999;background:rgba(0,0,0,.85);color:#fff;font:12px/1.5 monospace;padding:8px 10px;border-radius:10px;direction:ltr;white-space:pre-wrap;pointer-events:none';
    document.body.append(probe, box);
    const show = () => {
      const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect();
      box.textContent =
        `innerH ${window.innerHeight}  outerH ${window.outerHeight}  clientH ${document.documentElement.clientHeight}\n` +
        `vv.h ${vv ? vv.height.toFixed(1) : '-'}  vv.top ${vv ? vv.offsetTop.toFixed(1) : '-'}  scale ${vv ? vv.scale.toFixed(2) : '-'}\n` +
        `screen ${screen.width}x${screen.height}  avail ${screen.availHeight}  dpr ${devicePixelRatio}\n` +
        `safe-bottom ${probe.offsetHeight}  nav.top ${nav ? Math.round(nav.top) : '-'} nav.bottom ${nav ? Math.round(nav.bottom) : '-'}\n` +
        `scrollY ${Math.round(scrollY)}  standalone ${!!navigator.standalone}\n` +
        (navigator.userAgent.match(/(CriOS|Version)\/[\d.]+|OS [\d_]+/g) || []).join('  ');
    };
    ['resize', 'scroll'].forEach(e => { window.addEventListener(e, show); vv && vv.addEventListener(e, show); });
    show(); setInterval(show, 1000);
  }
  document.getElementById('addTransactionBtn').addEventListener('click', addTransaction);
  document.getElementById('shareReportBtn').addEventListener('click', shareReport);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', importData);
  document.getElementById('clearBtn').addEventListener('click', clearAllData);
  document.getElementById('searchInput')?.addEventListener('input', applyFilters);
  document.getElementById('filterType')?.addEventListener('change', applyFilters);
  document.getElementById('filterAccount')?.addEventListener('change', applyFilters);
  document.getElementById('filterDateFrom')?.addEventListener('change', applyFilters);
  document.getElementById('filterDateTo')?.addEventListener('change', applyFilters);
  document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);
  document.getElementById('addAccountBtn')?.addEventListener('click', openAddAccount);
  document.getElementById('saveAccountBtn')?.addEventListener('click', saveAccount);
  document.getElementById('cancelAccountBtn')?.addEventListener('click', closeAccountModal);
  document.getElementById('saveEditTxBtn')?.addEventListener('click', saveEditTransaction);
  document.getElementById('cancelEditTxBtn')?.addEventListener('click', closeEditTransactionModal);

  // لما ترجع للصفحة (من تطبيق تاني أو جهاز تاني) نجيب آخر نسخة
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshIfChanged(); });
  window.addEventListener('focus', refreshIfChanged);

  // Quick search
  document.getElementById('quickSearchInput')?.addEventListener('input', doQuickSearch);
  document.addEventListener('click', e => {
    const qs = document.getElementById('quickSearchResults');
    if (qs && !qs.contains(e.target) && e.target.id !== 'quickSearchInput') {
      qs.style.display = 'none';
    }
  });

  // Month navigation
  document.getElementById('prevMonth')?.addEventListener('click', () => {
    statsMonth--; if(statsMonth<0){statsMonth=11;statsYear--;} updateStatisticsTab();
  });
  document.getElementById('nextMonth')?.addEventListener('click', () => {
    const now=new Date();
    if(statsYear<now.getFullYear()||(statsYear===now.getFullYear()&&statsMonth<now.getMonth())){
      statsMonth++; if(statsMonth>11){statsMonth=0;statsYear++;} updateStatisticsTab();
    }
  });
}

// =====================
// AUTH — تسجيل الدخول (Supabase Auth)
// لا يتم تحميل أي بيانات قبل وجود جلسة دخول صالحة
// =====================
let appStarted = false;
async function startApp() {
  if (appStarted) return;
  appStarted = true;
  await init();
}

function showAuthScreen(mode) {
  const subs = {
    login: 'سجّل الدخول للمتابعة',
    forgot: 'اكتب بريدك وسنرسل لك رابط تغيير كلمة السر',
    newpass: 'اكتب كلمة السر الجديدة'
  };
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('authSub').textContent = subs[mode] || '';
  const forms = { login: 'authLoginForm', forgot: 'authForgotForm', newpass: 'authNewpassForm' };
  Object.entries(forms).forEach(([m, id]) => {
    document.getElementById(id).style.display = m === mode ? 'flex' : 'none';
  });
  setAuthMsg('');
}

function hideAuthScreen() { document.getElementById('authScreen').classList.add('hidden'); }

function setAuthMsg(text, type = 'error') {
  const el = document.getElementById('authMsg');
  el.textContent = text;
  el.className = 'auth-msg' + (text ? ' ' + type : '');
}

function setAuthBusy(btnId, busy, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = busy;
  btn.textContent = busy ? 'لحظة...' : label;
}

async function authLogin(event) {
  event.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  setAuthMsg('');
  setAuthBusy('authLoginBtn', true);
  const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
  setAuthBusy('authLoginBtn', false, 'دخول');
  if (error) {
    console.error(error);
    setAuthMsg(error.message === 'Invalid login credentials'
      ? 'البريد أو كلمة السر غير صحيحة'
      : 'تعذر تسجيل الدخول — تأكد من الاتصال وحاول مرة أخرى');
    return;
  }
  document.getElementById('authPassword').value = '';
  hideAuthScreen();
  startApp();
}

async function authSendReset(event) {
  event.preventDefault();
  const email = document.getElementById('authForgotEmail').value.trim();
  setAuthMsg('');
  setAuthBusy('authForgotBtn', true);
  const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + location.pathname
  });
  setAuthBusy('authForgotBtn', false, 'إرسال رابط تغيير كلمة السر');
  if (error) {
    console.error(error);
    setAuthMsg('تعذر إرسال الرابط — حاول مرة أخرى بعد قليل');
    return;
  }
  setAuthMsg('لو البريد مسجّل، هيوصلك رابط تغيير كلمة السر خلال دقائق', 'ok');
}

async function authSetNewPassword(event) {
  event.preventDefault();
  const p1 = document.getElementById('authNewpass').value;
  const p2 = document.getElementById('authNewpass2').value;
  if (p1 !== p2) { setAuthMsg('كلمتا السر غير متطابقتين'); return; }
  setAuthMsg('');
  setAuthBusy('authNewpassBtn', true);
  const { error } = await window.supabaseClient.auth.updateUser({ password: p1 });
  setAuthBusy('authNewpassBtn', false, 'حفظ كلمة السر');
  if (error) {
    console.error(error);
    setAuthMsg('تعذر حفظ كلمة السر — الرابط قد يكون منتهي، اطلب رابط جديد');
    return;
  }
  window.__authRecovery = false;
  history.replaceState(null, '', location.pathname);
  hideAuthScreen();
  showToast('تم تغيير كلمة السر', 'success');
  startApp();
}

async function authLogout() {
  if (!await showConfirmToast('تسجيل الخروج؟')) return;
  await window.supabaseClient.auth.signOut();
  location.reload();
}

async function authGate() {
  const sb = window.supabaseClient;
  if (!sb) { showAuthScreen('login'); setAuthMsg('خطأ في الاتصال بقاعدة البيانات'); return; }
  sb.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') { window.__authRecovery = true; showAuthScreen('newpass'); }
  });
  const { data, error } = await sb.auth.getSession();
  if (window.__authRecovery) { showAuthScreen('newpass'); return; }
  if (error || !data?.session) { showAuthScreen('login'); return; }
  hideAuthScreen();
  startApp();
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', authGate);
else authGate();

// Treasury Management Application
// Phase C — Statistics & Charts

const DEFAULT_ACCOUNTS = {
  ahly:       { name: 'البنك الأهلي', type: 'bank' },
  masr:       { name: 'بنك مصر', type: 'bank' },
  qatar:      { name: 'بنك قطر', type: 'bank' },
  cib:        { name: 'البنك التجاري الدولي', type: 'bank' },
  alex_shimaa:{ name: 'بنك الإسكندرية - شيماء', type: 'bank' },
  alex_omar:  { name: 'بنك الإسكندرية - عمر', type: 'bank' },
  abudhabi:   { name: 'بنك أبوظبي', type: 'bank' },
  etisalat:   { name: 'محفظة اتصالات', type: 'wallet' },
  vodafone:   { name: 'محفظة فودافون', type: 'wallet' }
};

let ACCOUNTS = { ...DEFAULT_ACCOUNTS };
let appData  = { accounts: { ...DEFAULT_ACCOUNTS }, balances: {}, transactions: [] };
let filterState = { search: '', type: 'all', account: 'all', dateFrom: '', dateTo: '' };

// Statistics state
let statsMonth = new Date().getMonth();
let statsYear  = new Date().getFullYear();
let chartInstances = {};

Object.keys(ACCOUNTS).forEach(k => { appData.balances[k] = 0; });

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

// =====================
// UTILS
// =====================
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) num = 0;
  return Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showSyncStatus(msg, type) {
  const s = document.getElementById('syncStatus');
  s.textContent = msg; s.className = `sync-status ${type}`; s.style.display = 'block';
  setTimeout(() => { s.style.display = 'none'; }, 3000);
}

function generateAccountKey(name) {
  return (name.replace(/\s+/g,'_').replace(/[^\w]/g,'') || 'account') + '_' + Date.now();
}

const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// =====================
// DATABASE
// =====================
async function saveToDatabase() {
  try {
    appData.accounts = { ...ACCOUNTS };
    const { error } = await window.supabaseClient.from('treasury_data')
      .upsert({ id: 1, data: appData, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) throw error;
    showSyncStatus('✅ تم الحفظ', 'success');
    return true;
  } catch (e) {
    showToast('خطأ في الحفظ: ' + e.message, 'error');
    return false;
  }
}

async function loadFromDatabase() {
  try {
    const { data, error } = await window.supabaseClient.from('treasury_data')
      .select('*').order('updated_at', { ascending: false }).limit(1);
    if (error) { console.log('Load error:', error); return false; }
    if (data && data.length > 0 && data[0].data) {
      appData = data[0].data;
      ACCOUNTS = (appData.accounts && Object.keys(appData.accounts).length > 0)
        ? { ...appData.accounts } : { ...DEFAULT_ACCOUNTS };
      appData.accounts = { ...ACCOUNTS };
      Object.keys(ACCOUNTS).forEach(k => { if (appData.balances[k] == null) appData.balances[k] = 0; });
      if (!appData.transactions) appData.transactions = [];
      updateUI();
      showSyncStatus('✅ تم التحميل', 'success');
      return true;
    }
    return false;
  } catch (e) {
    showToast('خطأ في التحميل: ' + e.message, 'error');
    return false;
  }
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
            <span class="account-manage-icon">${acc.type==='bank'?'🏦':'📱'}</span>
            <div>
              <div class="account-manage-name">${acc.name}</div>
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
  document.getElementById('accountModal').classList.add('modal-show');
}

function openEditAccount(key) {
  const acc = ACCOUNTS[key]; if (!acc) return;
  document.getElementById('accountModalTitle').textContent = 'تعديل الحساب';
  document.getElementById('accountNameInput').value = acc.name;
  document.getElementById('accountTypeInput').value = acc.type;
  document.getElementById('accountEditKey').value = key;
  document.getElementById('accountModal').classList.add('modal-show');
}

function closeAccountModal() {
  document.getElementById('accountModal').classList.remove('modal-show');
}

async function saveAccount() {
  const name    = document.getElementById('accountNameInput').value.trim();
  const type    = document.getElementById('accountTypeInput').value;
  const editKey = document.getElementById('accountEditKey').value;
  if (!name) { showToast('من فضلك أدخل اسم الحساب','warning'); return; }
  if (Object.entries(ACCOUNTS).find(([k,v]) => v.name===name && k!==editKey))
    { showToast('يوجد حساب بنفس الاسم','warning'); return; }
  if (editKey) {
    ACCOUNTS[editKey].name = name; ACCOUNTS[editKey].type = type;
    showToast(`تم تعديل "${name}" بنجاح`,'success');
  } else {
    const key = generateAccountKey(name);
    ACCOUNTS[key] = { name, type }; appData.balances[key] = 0;
    showToast(`تم إضافة "${name}" بنجاح`,'success');
  }
  closeAccountModal(); await saveToDatabase(); updateUI();
}

async function deleteAccount(key) {
  const acc = ACCOUNTS[key]; if (!acc) return;
  const bal = appData.balances[key] || 0;
  const msg = bal !== 0
    ? `⚠️ حساب "${acc.name}" فيه رصيد ${formatNumber(bal)} جنيه. هل أنت متأكد من الحذف؟`
    : `هل تريد حذف حساب "${acc.name}"؟`;
  if (!await showConfirmToast(msg)) return;
  delete ACCOUNTS[key]; delete appData.balances[key];
  await saveToDatabase(); updateUI();
  showToast(`تم حذف حساب "${acc.name}"`,'info');
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
    card.innerHTML = `<div class="card-icon">${ACCOUNTS[key].type==='bank'?'🏦':'📱'}</div><h3>${ACCOUNTS[key].name}</h3><div class="amount">${formatNumber(bal)} <span>جنيه</span></div>`;
    grid.appendChild(card);
  });
  const el = id => document.getElementById(id);
  if (el('totalBalance'))  el('totalBalance').textContent  = `${formatNumber(total)} جنيه`;
  if (el('bankTotal'))     el('bankTotal').textContent     = `${formatNumber(bankTotal)} جنيه`;
  if (el('walletTotal'))   el('walletTotal').textContent   = `${formatNumber(walletTotal)} جنيه`;
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

  // KPI
  let totalIncome=0, totalExpense=0;
  monthTx.forEach(t => {
    if (t.type==='income')  totalIncome  += t.amount;
    if (t.type==='expense') totalExpense += t.amount;
  });
  const net = totalIncome - totalExpense;

  document.getElementById('kpiIncome').textContent  = `${formatNumber(totalIncome)} جنيه`;
  document.getElementById('kpiExpense').textContent = `${formatNumber(totalExpense)} جنيه`;
  const netEl = document.getElementById('kpiNet');
  netEl.textContent = `${formatNumber(net)} جنيه`;
  netEl.style.color = net >= 0 ? '#28a745' : '#dc3545';
  document.getElementById('kpiCount').textContent = monthTx.length;

  // Top accounts
  const incomeByAcc = {}, expenseByAcc = {};
  monthTx.forEach(t => {
    if (t.type==='income'  && t.accountTo)   incomeByAcc[t.accountTo]   = (incomeByAcc[t.accountTo]  ||0)+t.amount;
    if (t.type==='expense' && t.accountFrom) expenseByAcc[t.accountFrom]= (expenseByAcc[t.accountFrom]||0)+t.amount;
  });
  const topInc = Object.entries(incomeByAcc).sort((a,b)=>b[1]-a[1])[0];
  const topExp = Object.entries(expenseByAcc).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('topIncomeAccount').innerHTML  = topInc ? `<strong>${ACCOUNTS[topInc[0]]?.name||topInc[0]}</strong><span>${formatNumber(topInc[1])} جنيه</span>` : '<span>لا توجد بيانات</span>';
  document.getElementById('topExpenseAccount').innerHTML = topExp ? `<strong>${ACCOUNTS[topExp[0]]?.name||topExp[0]}</strong><span>${formatNumber(topExp[1])} جنيه</span>` : '<span>لا توجد بيانات</span>';

  renderMonthlyCompareChart();
  renderBalanceTrendChart();
  renderBalanceDistChart();
  renderTypeDistChart();
  renderAccountsBarChart(monthTx);
}

function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

// Chart 1 — Monthly comparison (last 6 months)
function renderMonthlyCompareChart() {
  destroyChart('monthlyCompare');
  const labels=[], incomes=[], expenses=[];
  for (let i=5; i>=0; i--) {
    let m = statsMonth - i; let y = statsYear;
    if (m < 0) { m += 12; y -= 1; }
    labels.push(`${MONTH_NAMES[m].substring(0,3)} ${y}`);
    const tx = appData.transactions.filter(t => {
      const d=new Date(t.date); return d.getMonth()===m && d.getFullYear()===y;
    });
    incomes.push(tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    expenses.push(tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
  }
  const ctx = document.getElementById('monthlyCompareChart').getContext('2d');
  chartInstances['monthlyCompare'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'إيداعات', data: incomes,  backgroundColor: 'rgba(40,167,69,0.75)',  borderColor: '#28a745', borderWidth: 2, borderRadius: 6 },
        { label: 'سحوبات',  data: expenses, backgroundColor: 'rgba(220,53,69,0.75)', borderColor: '#dc3545', borderWidth: 2, borderRadius: 6 }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } } } }
  });
}

// Chart 2 — Balance trend
function renderBalanceTrendChart() {
  destroyChart('balanceTrend');
  const sorted = [...appData.transactions].sort((a,b)=>new Date(a.date)-new Date(b.date));
  let running = 0;
  const points = [];
  sorted.forEach(t => {
    if (t.type==='income')  running += t.amount;
    if (t.type==='expense') running -= t.amount;
    const d = new Date(t.date);
    points.push({ x: d.toLocaleDateString('ar-EG'), y: running });
  });

  // Sample max 30 points for readability
  const step = Math.max(1, Math.floor(points.length/30));
  const sampled = points.filter((_,i)=>i%step===0 || i===points.length-1);

  const ctx = document.getElementById('balanceTrendChart').getContext('2d');
  chartInstances['balanceTrend'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sampled.map(p=>p.x),
      datasets: [{
        label: 'الرصيد الإجمالي',
        data: sampled.map(p=>p.y),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102,126,234,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: sampled.length < 15 ? 4 : 2,
        borderWidth: 2
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => formatNumber(v) } }, x: { ticks: { maxRotation: 45 } } } }
  });
}

// Chart 3 — Balance distribution (doughnut)
function renderBalanceDistChart() {
  destroyChart('balanceDist');
  const keys    = Object.keys(ACCOUNTS).filter(k => (appData.balances[k]||0) > 0);
  const labels  = keys.map(k => ACCOUNTS[k].name);
  const values  = keys.map(k => appData.balances[k]||0);
  const colors  = ['#667eea','#28a745','#ffc107','#17a2b8','#dc3545','#6f42c1','#fd7e14','#20c997','#e83e8c','#6c757d'];

  if (!values.length) { document.getElementById('balanceDistChart').parentElement.innerHTML='<p class="empty-state">لا يوجد رصيد</p>'; return; }

  const ctx = document.getElementById('balanceDistChart').getContext('2d');
  chartInstances['balanceDist'] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0,values.length), borderWidth: 2 }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });
}

// Chart 4 — Transaction type distribution (pie)
function renderTypeDistChart() {
  destroyChart('typeDist');
  const monthTx = appData.transactions.filter(t => {
    const d=new Date(t.date); return d.getMonth()===statsMonth && d.getFullYear()===statsYear;
  });
  const inc = monthTx.filter(t=>t.type==='income').length;
  const exp = monthTx.filter(t=>t.type==='expense').length;
  const tra = monthTx.filter(t=>t.type==='transfer').length;

  if (!monthTx.length) { document.getElementById('typeDistChart').parentElement.innerHTML='<p class="empty-state">لا توجد معاملات هذا الشهر</p>'; return; }

  const ctx = document.getElementById('typeDistChart').getContext('2d');
  chartInstances['typeDist'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['إيداع','سحب','تحويل'],
      datasets: [{ data: [inc,exp,tra], backgroundColor: ['#28a745','#dc3545','#667eea'], borderWidth: 2 }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

// Chart 5 — Accounts bar (income vs expense per account this month)
function renderAccountsBarChart(monthTx) {
  destroyChart('accountsBar');
  const keys = Object.keys(ACCOUNTS);
  const incomes  = keys.map(k => monthTx.filter(t=>t.type==='income' && t.accountTo===k).reduce((s,t)=>s+t.amount,0));
  const expenses = keys.map(k => monthTx.filter(t=>t.type==='expense'&& t.accountFrom===k).reduce((s,t)=>s+t.amount,0));
  const labels   = keys.map(k => ACCOUNTS[k].name);

  const ctx = document.getElementById('accountsBarChart').getContext('2d');
  chartInstances['accountsBar'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'إيداعات', data: incomes,  backgroundColor: 'rgba(40,167,69,0.75)',  borderRadius: 5 },
        { label: 'سحوبات',  data: expenses, backgroundColor: 'rgba(220,53,69,0.75)', borderRadius: 5 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } },
        x: { ticks: { maxRotation: 30, font: { size: 11 } } }
      }
    }
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
  return appData.transactions.filter(t => {
    if (filterState.search) {
      if (!(t.notes&&t.notes.toLowerCase().includes(filterState.search)) && !t.amount.toString().includes(filterState.search)) return false;
    }
    if (filterState.type!=='all' && t.type!==filterState.type) return false;
    if (filterState.account!=='all' && t.accountFrom!==filterState.account && t.accountTo!==filterState.account) return false;
    if (filterState.dateFrom && new Date(t.date).toISOString().split('T')[0] < filterState.dateFrom) return false;
    if (filterState.dateTo   && new Date(t.date).toISOString().split('T')[0] > filterState.dateTo)   return false;
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

  list.innerHTML = filtered.map(t => {
    const date    = new Date(t.date);
    const dateStr = date.toLocaleDateString('ar-EG')+' '+date.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
    let typeText='', details='', typeClass='';
    if (t.type==='income')   { typeText='💰 إيداع';  typeClass='type-income';   details=`إلى: ${getAccountName(t.accountTo)}`; }
    else if (t.type==='expense')  { typeText='💸 سحب';   typeClass='type-expense';  details=`من: ${getAccountName(t.accountFrom)}`; }
    else                          { typeText='🔄 تحويل'; typeClass='type-transfer'; details=`من: ${getAccountName(t.accountFrom)} ← إلى: ${getAccountName(t.accountTo)}`; }
    return `<div class="transaction-item ${t.type}">
      <div class="transaction-header">
        <span class="transaction-type ${typeClass}">${typeText}</span>
        <span class="transaction-amount">${formatNumber(t.amount)} جنيه</span>
      </div>
      <div class="transaction-details">${details}</div>
      ${t.notes?`<div class="transaction-notes">📝 ${t.notes}</div>`:''}
      <div class="transaction-footer">
        <span class="transaction-date">🕐 ${dateStr}</span>
        <button class="delete-btn" onclick="deleteTransaction(${t.id})">🗑️ حذف</button>
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
// REPORT
// =====================
function updateReport() {
  const today = new Date().toLocaleDateString('ar-EG');
  let total=0;
  Object.keys(ACCOUNTS).forEach(k=>{ const b=appData.balances[k]; if(b!=null&&!isNaN(b)) total+=Number(b); });
  let html=`<div class="total-balance"><h2>التقرير اليومي — ${today}</h2><div class="amount">${formatNumber(total)} جنيه</div></div>
    <div class="report-section"><h3>🏦 الحسابات البنكية</h3>`;
  Object.keys(ACCOUNTS).forEach(k=>{ if(ACCOUNTS[k].type==='bank') html+=`<div class="report-item"><span>${ACCOUNTS[k].name}</span><strong>${formatNumber(appData.balances[k]||0)} جنيه</strong></div>`; });
  html+=`</div><div class="report-section"><h3>📱 المحافظ الإلكترونية</h3>`;
  Object.keys(ACCOUNTS).forEach(k=>{ if(ACCOUNTS[k].type==='wallet') html+=`<div class="report-item"><span>${ACCOUNTS[k].name}</span><strong>${formatNumber(appData.balances[k]||0)} جنيه</strong></div>`; });
  html+=`</div>`;
  const el=document.getElementById('reportContent'); if(el) el.innerHTML=html;
}

// =====================
// FORM FUNCTIONS
// =====================
function updateFormFields() {
  const type=document.getElementById('transactionType').value;
  const fg=document.getElementById('accountFromGroup'), tg=document.getElementById('accountToGroup');
  if (type==='income')  { fg.style.display='none';  tg.style.display='block'; document.querySelector('#accountToGroup label').textContent='إلى الحساب'; }
  else if (type==='expense') { fg.style.display='block'; tg.style.display='none'; document.querySelector('#accountFromGroup label').textContent='من الحساب'; }
  else { fg.style.display='block'; tg.style.display='block'; }
}

function populateAccountSelects() {
  const fs=document.getElementById('accountFrom'), ts=document.getElementById('accountTo'); if(!fs||!ts) return;
  const fv=fs.value, tv=ts.value;
  fs.innerHTML=''; ts.innerHTML='';
  Object.keys(ACCOUNTS).forEach(key=>{
    const o=document.createElement('option'); o.value=key; o.textContent=ACCOUNTS[key].name;
    if(key===fv) o.selected=true; fs.appendChild(o);
    const o2=o.cloneNode(true); if(key===tv) o2.selected=true; ts.appendChild(o2);
  });
}

// =====================
// TRANSACTIONS
// =====================
async function addTransaction() {
  const type=document.getElementById('transactionType').value;
  const amount=parseFloat(document.getElementById('amount').value);
  const notes=document.getElementById('notes').value;
  const accountFrom=document.getElementById('accountFrom').value;
  const accountTo=document.getElementById('accountTo').value;
  if (!amount||amount<=0) { showToast('من فضلك أدخل مبلغ صحيح','warning'); return; }
  if (type==='transfer'&&accountFrom===accountTo) { showToast('لا يمكن التحويل إلى نفس الحساب','warning'); return; }
  const tx = { id:Date.now(), type, amount, notes, accountFrom:type!=='income'?accountFrom:null, accountTo:type!=='expense'?accountTo:null, date:new Date().toISOString() };
  if (type==='income') { appData.balances[accountTo]+=amount; }
  else if (type==='expense') { if(appData.balances[accountFrom]<amount){showToast('الرصيد غير كافي','error');return;} appData.balances[accountFrom]-=amount; }
  else { if(appData.balances[accountFrom]<amount){showToast('الرصيد غير كافي','error');return;} appData.balances[accountFrom]-=amount; appData.balances[accountTo]+=amount; }
  appData.transactions.unshift(tx);
  if (await saveToDatabase()) {
    document.getElementById('amount').value=''; document.getElementById('notes').value='';
    updateUI(); showToast('تم حفظ المعاملة بنجاح','success'); showTab('dashboard');
  }
}

async function deleteTransaction(id) {
  if (!await showConfirmToast('هل تريد حذف هذه المعاملة؟')) return;
  const t=appData.transactions.find(x=>x.id===id); if(!t) return;
  if (t.type==='income')   appData.balances[t.accountTo]-=t.amount;
  else if (t.type==='expense')  appData.balances[t.accountFrom]+=t.amount;
  else { appData.balances[t.accountFrom]+=t.amount; appData.balances[t.accountTo]-=t.amount; }
  appData.transactions=appData.transactions.filter(x=>x.id!==id);
  await saveToDatabase(); updateUI(); showToast('تم حذف المعاملة','info');
}

// =====================
// REPORT SHARE
// =====================
function shareReport() {
  const today=new Date().toLocaleDateString('ar-EG');
  const total=Object.values(appData.balances).reduce((a,b)=>a+b,0);
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
  const blob=new Blob([JSON.stringify(appData,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=`treasury_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
  URL.revokeObjectURL(url); showToast('تم تصدير البيانات بنجاح','success');
}

async function importData() {
  const file=document.getElementById('importFile').files[0];
  if (!file) { showToast('من فضلك اختر ملف','warning'); return; }
  const reader=new FileReader();
  reader.onload=async e=>{
    try {
      const imp=JSON.parse(e.target.result);
      if (!await showConfirmToast('سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟')) return;
      appData=imp; if(appData.accounts) ACCOUNTS={...appData.accounts};
      await saveToDatabase(); updateUI(); showToast('تم الاستيراد بنجاح','success'); showTab('dashboard');
    } catch { showToast('خطأ في قراءة الملف','error'); }
  };
  reader.readAsText(file);
}

async function clearAllData() {
  if (!await showConfirmToast('⚠️ سيتم حذف جميع البيانات نهائياً. هل أنت متأكد؟')) return;
  if (!await showConfirmToast('تأكيد أخير — لا يمكن التراجع!')) return;
  ACCOUNTS={...DEFAULT_ACCOUNTS};
  appData={accounts:{...DEFAULT_ACCOUNTS},balances:{},transactions:[]};
  Object.keys(ACCOUNTS).forEach(k=>{appData.balances[k]=0;});
  await saveToDatabase(); updateUI(); showToast('تم حذف جميع البيانات','info'); showTab('dashboard');
}

// =====================
// TAB NAVIGATION
// =====================
function showTab(tabName) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  const target=document.querySelector(`[data-tab="${tabName}"]`);
  if(target) target.classList.add('active');
  document.getElementById(tabName).classList.add('active');
  if (tabName==='statistics') updateStatisticsTab();
}

// =====================
// INIT
// =====================
async function init() {
  console.log('Initializing...');
  await loadFromDatabase();
  populateAccountSelects();
  updateFormFields();
  updateUI();
  setupEventListeners();
  console.log('Ready');
}

function setupEventListeners() {
  document.querySelectorAll('.tab').forEach(tab=>{
    tab.addEventListener('click', function(){ showTab(this.getAttribute('data-tab')); });
  });
  document.getElementById('transactionType').addEventListener('change', updateFormFields);
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

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();

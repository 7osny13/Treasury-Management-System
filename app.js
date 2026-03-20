// Treasury Management Application
// Main JavaScript File - Phase B: Account Management

// Default Accounts Configuration
const DEFAULT_ACCOUNTS = {
  ahly:       { name: 'البنك الأهلي',               type: 'bank' },
  masr:       { name: 'بنك مصر',                    type: 'bank' },
  qatar:      { name: 'بنك قطر',                    type: 'bank' },
  cib:        { name: 'البنك التجاري الدولي',        type: 'bank' },
  alex_shimaa:{ name: 'بنك الإسكندرية - شيماء',     type: 'bank' },
  alex_omar:  { name: 'بنك الإسكندرية - عمر',       type: 'bank' },
  abudhabi:   { name: 'بنك أبوظبي',                 type: 'bank' },
  etisalat:   { name: 'محفظة اتصالات',              type: 'wallet' },
  vodafone:   { name: 'محفظة فودافون',              type: 'wallet' }
};

// ACCOUNTS will be loaded from appData (supports dynamic add/remove)
let ACCOUNTS = { ...DEFAULT_ACCOUNTS };

// Application State
let appData = {
  balances: {},
  transactions: [],
  accounts: { ...DEFAULT_ACCOUNTS }  // NEW: accounts stored in DB
};

// Filter State
let filterState = {
  search: '',
  type: 'all',
  account: 'all',
  dateFrom: '',
  dateTo: ''
};

// =====================
// TOAST NOTIFICATIONS
// =====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '✅'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

function showConfirmToast(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <p>${message}</p>
        <div class="confirm-buttons">
          <button class="btn-confirm-yes">نعم، تأكيد</button>
          <button class="btn-confirm-no">إلغاء</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('confirm-show'));
    overlay.querySelector('.btn-confirm-yes').addEventListener('click', () => { overlay.remove(); resolve(true); });
    overlay.querySelector('.btn-confirm-no').addEventListener('click', () => { overlay.remove(); resolve(false); });
  });
}

// =====================
// UTILITY FUNCTIONS
// =====================
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) num = 0;
  return Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function generateAccountKey(name) {
  // Generate unique key from name + timestamp
  return 'acc_' + Date.now();
}

function showSyncStatus(message, type) {
  const status = document.getElementById('syncStatus');
  status.textContent = message;
  status.className = `sync-status ${type}`;
  status.style.display = 'block';
  setTimeout(() => { status.style.display = 'none'; }, 3000);
}

// =====================
// DATABASE FUNCTIONS
// =====================
async function saveToDatabase() {
  try {
    // Always sync ACCOUNTS into appData before saving
    appData.accounts = ACCOUNTS;

    const { error } = await window.supabaseClient
      .from('treasury_data')
      .upsert({
        id: 1,
        data: appData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    showSyncStatus('✅ تم الحفظ', 'success');
    return true;
  } catch (error) {
    console.error('Save error:', error);
    showToast('خطأ في الحفظ: ' + error.message, 'error');
    return false;
  }
}

async function loadFromDatabase() {
  try {
    const { data, error } = await window.supabaseClient
      .from('treasury_data')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) { console.log('Load error:', error); return false; }

    if (data && data.length > 0 && data[0].data) {
      appData = data[0].data;

      // Load accounts — use saved or fall back to defaults
      if (appData.accounts && Object.keys(appData.accounts).length > 0) {
        ACCOUNTS = appData.accounts;
      } else {
        ACCOUNTS = { ...DEFAULT_ACCOUNTS };
        appData.accounts = ACCOUNTS;
      }

      // Ensure balances exist for all accounts
      Object.keys(ACCOUNTS).forEach(key => {
        if (appData.balances[key] === undefined || appData.balances[key] === null) {
          appData.balances[key] = 0;
        }
      });

      if (!appData.transactions) appData.transactions = [];

      updateUI();
      showSyncStatus('✅ تم التحميل', 'success');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Load error:', error);
    showToast('خطأ في التحميل: ' + error.message, 'error');
    return false;
  }
}

// =====================
// UI UPDATE FUNCTIONS
// =====================
function updateUI() {
  updateDashboard();
  updateTransactionsList();
  updateReport();
  updateAccountsManager();
  populateAccountSelects();
  // Reset filter account dropdown
  const filterAccount = document.getElementById('filterAccount');
  if (filterAccount) filterAccount.dataset.populated = '';
  populateFilterAccountSelect();
}

function updateDashboard() {
  const grid = document.getElementById('balanceGrid');
  if (!grid) return;
  grid.innerHTML = '';

  let total = 0, bankTotal = 0, walletTotal = 0;

  Object.keys(ACCOUNTS).forEach(key => {
    let balance = appData.balances[key];
    if (balance === undefined || balance === null || isNaN(balance)) {
      balance = 0;
      appData.balances[key] = 0;
    }
    total += Number(balance);
    if (ACCOUNTS[key].type === 'bank') bankTotal += Number(balance);
    else walletTotal += Number(balance);

    const card = document.createElement('div');
    card.className = `balance-card ${ACCOUNTS[key].type === 'wallet' ? 'wallet-card' : ''}`;
    card.innerHTML = `
      <div class="card-icon">${ACCOUNTS[key].type === 'bank' ? '🏦' : '📱'}</div>
      <h3>${ACCOUNTS[key].name}</h3>
      <div class="amount">${formatNumber(balance)} <span>جنيه</span></div>
    `;
    grid.appendChild(card);
  });

  const totalBalanceEl = document.getElementById('totalBalance');
  if (totalBalanceEl) totalBalanceEl.textContent = `${formatNumber(total)} جنيه`;
  const bankTotalEl = document.getElementById('bankTotal');
  if (bankTotalEl) bankTotalEl.textContent = `${formatNumber(bankTotal)} جنيه`;
  const walletTotalEl = document.getElementById('walletTotal');
  if (walletTotalEl) walletTotalEl.textContent = `${formatNumber(walletTotal)} جنيه`;
}

// =====================
// ACCOUNT MANAGEMENT
// =====================
function updateAccountsManager() {
  const list = document.getElementById('accountsList');
  if (!list) return;

  const banks = Object.entries(ACCOUNTS).filter(([, v]) => v.type === 'bank');
  const wallets = Object.entries(ACCOUNTS).filter(([, v]) => v.type === 'wallet');

  function renderGroup(entries, title, icon) {
    if (entries.length === 0) return '';
    return `
      <div class="accounts-group">
        <h4 class="accounts-group-title">${icon} ${title}</h4>
        ${entries.map(([key, acc]) => {
          const balance = appData.balances[key] || 0;
          const txCount = appData.transactions.filter(t => t.accountFrom === key || t.accountTo === key).length;
          return `
            <div class="account-manage-item">
              <div class="account-manage-info">
                <span class="account-manage-name">${acc.name}</span>
                <span class="account-manage-meta">
                  رصيد: ${formatNumber(balance)} جنيه
                  ${txCount > 0 ? `• ${txCount} معاملة` : ''}
                </span>
              </div>
              <div class="account-manage-actions">
                <button class="btn-edit-account" onclick="openEditAccount('${key}')">✏️ تعديل</button>
                <button class="btn-delete-account" onclick="deleteAccount('${key}')">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  list.innerHTML = renderGroup(banks, 'الحسابات البنكية', '🏦') +
                   renderGroup(wallets, 'المحافظ الإلكترونية', '📱');
}

async function addAccount() {
  const nameInput = document.getElementById('newAccountName');
  const typeInput = document.getElementById('newAccountType');
  const name = nameInput.value.trim();
  const type = typeInput.value;

  if (!name) {
    showToast('من فضلك أدخل اسم الحساب', 'warning');
    return;
  }

  // Check duplicate name
  const duplicate = Object.values(ACCOUNTS).find(a => a.name === name);
  if (duplicate) {
    showToast('يوجد حساب بنفس الاسم بالفعل', 'warning');
    return;
  }

  const key = generateAccountKey(name);
  ACCOUNTS[key] = { name, type };
  appData.balances[key] = 0;
  appData.accounts = ACCOUNTS;

  const saved = await saveToDatabase();
  if (saved) {
    nameInput.value = '';
    updateUI();
    showToast(`تم إضافة "${name}" بنجاح ✅`, 'success');
  }
}

function openEditAccount(key) {
  const acc = ACCOUNTS[key];
  if (!acc) return;

  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog edit-dialog">
      <h3 style="margin-bottom:16px;color:#667eea;">✏️ تعديل الحساب</h3>
      <div class="form-group" style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:14px;">اسم الحساب</label>
        <input type="text" id="editAccountName" value="${acc.name}"
          style="width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:15px;direction:rtl;">
      </div>
      <div class="form-group" style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:14px;">النوع</label>
        <select id="editAccountType"
          style="width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:15px;direction:rtl;">
          <option value="bank" ${acc.type === 'bank' ? 'selected' : ''}>🏦 بنك</option>
          <option value="wallet" ${acc.type === 'wallet' ? 'selected' : ''}>📱 محفظة إلكترونية</option>
        </select>
      </div>
      <div class="confirm-buttons">
        <button class="btn-confirm-yes" id="saveEditBtn">💾 حفظ التعديل</button>
        <button class="btn-confirm-no">إلغاء</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('confirm-show'));

  overlay.querySelector('#saveEditBtn').addEventListener('click', async () => {
    const newName = document.getElementById('editAccountName').value.trim();
    const newType = document.getElementById('editAccountType').value;

    if (!newName) { showToast('الاسم لا يمكن أن يكون فارغاً', 'warning'); return; }

    // Check duplicate (excluding current)
    const duplicate = Object.entries(ACCOUNTS).find(([k, a]) => a.name === newName && k !== key);
    if (duplicate) { showToast('يوجد حساب بنفس الاسم', 'warning'); return; }

    ACCOUNTS[key].name = newName;
    ACCOUNTS[key].type = newType;
    appData.accounts = ACCOUNTS;

    overlay.remove();
    const saved = await saveToDatabase();
    if (saved) {
      updateUI();
      showToast(`تم تعديل الحساب بنجاح ✅`, 'success');
    }
  });

  overlay.querySelector('.btn-confirm-no').addEventListener('click', () => overlay.remove());
}

async function deleteAccount(key) {
  const acc = ACCOUNTS[key];
  if (!acc) return;

  const balance = appData.balances[key] || 0;
  const txCount = appData.transactions.filter(t => t.accountFrom === key || t.accountTo === key).length;

  // Build warning message
  let warningMsg = `هل تريد حذف حساب "${acc.name}"؟`;
  if (balance > 0) {
    warningMsg += `\n\n⚠️ تنبيه: الحساب يحتوي على رصيد ${formatNumber(balance)} جنيه سيُفقد.`;
  }
  if (txCount > 0) {
    warningMsg += `\n\n📋 ملاحظة: يوجد ${txCount} معاملة مرتبطة ستبقى في السجل.`;
  }

  const confirmed = await showConfirmToast(warningMsg);
  if (!confirmed) return;

  // Delete account and its balance
  delete ACCOUNTS[key];
  delete appData.balances[key];
  appData.accounts = ACCOUNTS;

  const saved = await saveToDatabase();
  if (saved) {
    updateUI();
    showToast(`تم حذف حساب "${acc.name}"`, 'info');
  }
}

// =====================
// SEARCH & FILTER
// =====================
function applyFilters() {
  filterState.search   = document.getElementById('searchInput')?.value?.trim().toLowerCase() || '';
  filterState.type     = document.getElementById('filterType')?.value || 'all';
  filterState.account  = document.getElementById('filterAccount')?.value || 'all';
  filterState.dateFrom = document.getElementById('filterDateFrom')?.value || '';
  filterState.dateTo   = document.getElementById('filterDateTo')?.value || '';
  renderFilteredTransactions();
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterType').value = 'all';
  document.getElementById('filterAccount').value = 'all';
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';
  filterState = { search: '', type: 'all', account: 'all', dateFrom: '', dateTo: '' };
  renderFilteredTransactions();
}

function getFilteredTransactions() {
  return appData.transactions.filter(t => {
    if (filterState.search) {
      const notesMatch  = t.notes && t.notes.toLowerCase().includes(filterState.search);
      const amountMatch = t.amount.toString().includes(filterState.search);
      if (!notesMatch && !amountMatch) return false;
    }
    if (filterState.type !== 'all' && t.type !== filterState.type) return false;
    if (filterState.account !== 'all') {
      if (t.accountFrom !== filterState.account && t.accountTo !== filterState.account) return false;
    }
    if (filterState.dateFrom) {
      if (new Date(t.date).toISOString().split('T')[0] < filterState.dateFrom) return false;
    }
    if (filterState.dateTo) {
      if (new Date(t.date).toISOString().split('T')[0] > filterState.dateTo) return false;
    }
    return true;
  });
}

function getAccountName(key) {
  return ACCOUNTS[key]?.name || key || 'حساب محذوف';
}

function renderFilteredTransactions() {
  const list = document.getElementById('transactionsList');
  const filtered = getFilteredTransactions();
  const countEl = document.getElementById('transactionsCount');
  if (countEl) countEl.textContent = `${filtered.length} معاملة من أصل ${appData.transactions.length}`;

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-state">لا توجد معاملات تطابق البحث</p>';
    return;
  }

  list.innerHTML = filtered.map(t => {
    const date    = new Date(t.date);
    const dateStr = date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    let typeText = '', details = '', typeClass = '';

    if (t.type === 'income') {
      typeText = '💰 إيداع'; typeClass = 'type-income';
      details = `إلى: ${getAccountName(t.accountTo)}`;
    } else if (t.type === 'expense') {
      typeText = '💸 سحب'; typeClass = 'type-expense';
      details = `من: ${getAccountName(t.accountFrom)}`;
    } else {
      typeText = '🔄 تحويل'; typeClass = 'type-transfer';
      details = `من: ${getAccountName(t.accountFrom)} ← إلى: ${getAccountName(t.accountTo)}`;
    }

    return `
      <div class="transaction-item ${t.type}">
        <div class="transaction-header">
          <span class="transaction-type ${typeClass}">${typeText}</span>
          <span class="transaction-amount">${formatNumber(t.amount)} جنيه</span>
        </div>
        <div class="transaction-details">${details}</div>
        ${t.notes ? `<div class="transaction-notes">📝 ${t.notes}</div>` : ''}
        <div class="transaction-footer">
          <span class="transaction-date">🕐 ${dateStr}</span>
          <button class="delete-btn" onclick="deleteTransaction(${t.id})">🗑️ حذف</button>
        </div>
      </div>
    `;
  }).join('');
}

function updateTransactionsList() {
  populateFilterAccountSelect();
  renderFilteredTransactions();
}

function populateFilterAccountSelect() {
  const select = document.getElementById('filterAccount');
  if (!select) return;
  select.innerHTML = '<option value="all">كل الحسابات</option>';
  Object.keys(ACCOUNTS).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = ACCOUNTS[key].name;
    select.appendChild(opt);
  });
}

// =====================
// REPORT
// =====================
function updateReport() {
  const today = new Date().toLocaleDateString('ar-EG');
  let total = 0;
  Object.keys(ACCOUNTS).forEach(key => {
    const b = appData.balances[key];
    if (b !== undefined && !isNaN(b)) total += Number(b);
  });

  let html = `
    <div class="total-balance">
      <h2>التقرير اليومي — ${today}</h2>
      <div class="amount">${formatNumber(total)} جنيه</div>
    </div>
    <div class="report-section"><h3>🏦 الحسابات البنكية</h3>
  `;
  Object.keys(ACCOUNTS).forEach(key => {
    if (ACCOUNTS[key].type === 'bank') {
      html += `<div class="report-item"><span>${ACCOUNTS[key].name}</span><strong>${formatNumber(appData.balances[key] || 0)} جنيه</strong></div>`;
    }
  });
  html += `</div><div class="report-section"><h3>📱 المحافظ الإلكترونية</h3>`;
  Object.keys(ACCOUNTS).forEach(key => {
    if (ACCOUNTS[key].type === 'wallet') {
      html += `<div class="report-item"><span>${ACCOUNTS[key].name}</span><strong>${formatNumber(appData.balances[key] || 0)} جنيه</strong></div>`;
    }
  });
  html += `</div>`;
  const reportContent = document.getElementById('reportContent');
  if (reportContent) reportContent.innerHTML = html;
}

// =====================
// FORM FUNCTIONS
// =====================
function updateFormFields() {
  const type = document.getElementById('transactionType').value;
  const fromGroup = document.getElementById('accountFromGroup');
  const toGroup   = document.getElementById('accountToGroup');
  if (type === 'income') {
    fromGroup.style.display = 'none'; toGroup.style.display = 'block';
    document.querySelector('#accountToGroup label').textContent = 'إلى الحساب';
  } else if (type === 'expense') {
    fromGroup.style.display = 'block'; toGroup.style.display = 'none';
    document.querySelector('#accountFromGroup label').textContent = 'من الحساب';
  } else {
    fromGroup.style.display = 'block'; toGroup.style.display = 'block';
  }
}

function populateAccountSelects() {
  const fromSelect = document.getElementById('accountFrom');
  const toSelect   = document.getElementById('accountTo');
  if (!fromSelect || !toSelect) return;
  fromSelect.innerHTML = '';
  toSelect.innerHTML   = '';
  Object.keys(ACCOUNTS).forEach(key => {
    const o1 = document.createElement('option');
    o1.value = key; o1.textContent = ACCOUNTS[key].name;
    fromSelect.appendChild(o1);
    const o2 = o1.cloneNode(true);
    toSelect.appendChild(o2);
  });
}

// =====================
// TRANSACTION FUNCTIONS
// =====================
async function addTransaction() {
  const type        = document.getElementById('transactionType').value;
  const amount      = parseFloat(document.getElementById('amount').value);
  const notes       = document.getElementById('notes').value;
  const accountFrom = document.getElementById('accountFrom').value;
  const accountTo   = document.getElementById('accountTo').value;

  if (!amount || amount <= 0) { showToast('من فضلك أدخل مبلغ صحيح', 'warning'); return; }
  if (type === 'transfer' && accountFrom === accountTo) { showToast('لا يمكن التحويل إلى نفس الحساب', 'warning'); return; }

  const transaction = {
    id: Date.now(), type, amount, notes,
    accountFrom: type !== 'income'   ? accountFrom : null,
    accountTo:   type !== 'expense'  ? accountTo   : null,
    date: new Date().toISOString()
  };

  if (type === 'income') {
    appData.balances[accountTo] += amount;
  } else if (type === 'expense') {
    if (appData.balances[accountFrom] < amount) { showToast('الرصيد غير كافي في هذا الحساب', 'error'); return; }
    appData.balances[accountFrom] -= amount;
  } else {
    if (appData.balances[accountFrom] < amount) { showToast('الرصيد غير كافي في هذا الحساب', 'error'); return; }
    appData.balances[accountFrom] -= amount;
    appData.balances[accountTo]   += amount;
  }

  appData.transactions.unshift(transaction);
  const saved = await saveToDatabase();
  if (saved) {
    document.getElementById('amount').value = '';
    document.getElementById('notes').value  = '';
    updateUI();
    showToast('تم حفظ المعاملة بنجاح ✅', 'success');
    showTab('dashboard');
  }
}

async function deleteTransaction(id) {
  const confirmed = await showConfirmToast('هل تريد حذف هذه المعاملة؟');
  if (!confirmed) return;

  const transaction = appData.transactions.find(t => t.id === id);
  if (!transaction) return;

  if (transaction.type === 'income')   appData.balances[transaction.accountTo]   -= transaction.amount;
  else if (transaction.type === 'expense') appData.balances[transaction.accountFrom] += transaction.amount;
  else {
    appData.balances[transaction.accountFrom] += transaction.amount;
    appData.balances[transaction.accountTo]   -= transaction.amount;
  }

  appData.transactions = appData.transactions.filter(t => t.id !== id);
  await saveToDatabase();
  updateUI();
  showToast('تم حذف المعاملة', 'info');
}

// =====================
// REPORT SHARE
// =====================
function shareReport() {
  const today = new Date().toLocaleDateString('ar-EG');
  const total = Object.values(appData.balances).reduce((a, b) => a + b, 0);
  let message = `📊 *التقرير اليومي*\n📅 ${today}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `💰 *إجمالي الرصيد:*\n${formatNumber(total)} جنيه\n\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `🏦 *الحسابات البنكية:*\n\n`;
  Object.keys(ACCOUNTS).forEach(key => {
    if (ACCOUNTS[key].type === 'bank') message += `▪️ ${ACCOUNTS[key].name}\n ${formatNumber(appData.balances[key])} جنيه\n\n`;
  });
  message += `━━━━━━━━━━━━━━━━━━━━\n\n📱 *المحافظ الإلكترونية:*\n\n`;
  Object.keys(ACCOUNTS).forEach(key => {
    if (ACCOUNTS[key].type === 'wallet') message += `▪️ ${ACCOUNTS[key].name}\n ${formatNumber(appData.balances[key])} جنيه\n\n`;
  });
  message += `━━━━━━━━━━━━━━━━━━━━`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// =====================
// BACKUP FUNCTIONS
// =====================
function exportData() {
  const dataStr = JSON.stringify(appData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `treasury_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير البيانات بنجاح', 'success');
}

async function importData() {
  const file = document.getElementById('importFile').files[0];
  if (!file) { showToast('من فضلك اختر ملف للاستيراد', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      const confirmed = await showConfirmToast('سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟');
      if (confirmed) {
        appData = imported;
        if (appData.accounts) ACCOUNTS = appData.accounts;
        await saveToDatabase();
        updateUI();
        showToast('تم استيراد البيانات بنجاح', 'success');
        showTab('dashboard');
      }
    } catch { showToast('خطأ في قراءة الملف', 'error'); }
  };
  reader.readAsText(file);
}

async function clearAllData() {
  const c1 = await showConfirmToast('⚠️ سيتم حذف جميع البيانات نهائياً. هل أنت متأكد؟');
  if (!c1) return;
  const c2 = await showConfirmToast('تأكيد أخير — لا يمكن التراجع عن هذا الإجراء!');
  if (!c2) return;
  appData = { balances: {}, transactions: [], accounts: { ...DEFAULT_ACCOUNTS } };
  ACCOUNTS = { ...DEFAULT_ACCOUNTS };
  Object.keys(ACCOUNTS).forEach(key => { appData.balances[key] = 0; });
  await saveToDatabase();
  updateUI();
  showToast('تم حذف جميع البيانات', 'info');
  showTab('dashboard');
}

// =====================
// TAB NAVIGATION
// =====================
function showTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (targetTab) targetTab.classList.add('active');
  document.getElementById(tabName).classList.add('active');
}

// =====================
// INITIALIZE
// =====================
async function init() {
  console.log('Initializing Treasury Management System...');
  await loadFromDatabase();
  populateAccountSelects();
  updateFormFields();
  updateUI();
  setupEventListeners();
  console.log('Application initialized successfully');
}

function setupEventListeners() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() { showTab(this.getAttribute('data-tab')); });
  });
  document.getElementById('transactionType').addEventListener('change', updateFormFields);
  document.getElementById('addTransactionBtn').addEventListener('click', addTransaction);
  document.getElementById('shareReportBtn').addEventListener('click', shareReport);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', importData);
  document.getElementById('clearBtn').addEventListener('click', clearAllData);
  document.getElementById('addAccountBtn').addEventListener('click', addAccount);
  document.getElementById('searchInput')?.addEventListener('input', applyFilters);
  document.getElementById('filterType')?.addEventListener('change', applyFilters);
  document.getElementById('filterAccount')?.addEventListener('change', applyFilters);
  document.getElementById('filterDateFrom')?.addEventListener('change', applyFilters);
  document.getElementById('filterDateTo')?.addEventListener('change', applyFilters);
  document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

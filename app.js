// Treasury Management Application
// Main JavaScript File - Phase A Update

// Accounts Configuration
const ACCOUNTS = {
  ahly: { name: 'البنك الأهلي', type: 'bank' },
  masr: { name: 'بنك مصر', type: 'bank' },
  qatar: { name: 'بنك قطر', type: 'bank' },
  cib: { name: 'البنك التجاري الدولي', type: 'bank' },
  alex_shimaa: { name: 'بنك الإسكندرية - شيماء', type: 'bank' },
  alex_omar: { name: 'بنك الإسكندرية - عمر', type: 'bank' },
  abudhabi: { name: 'بنك أبوظبي', type: 'bank' },
  etisalat: { name: 'محفظة اتصالات', type: 'wallet' },
  vodafone: { name: 'محفظة فودافون', type: 'wallet' }
};

// Application State
let appData = {
  balances: {},
  transactions: []
};

// Filter State
let filterState = {
  search: '',
  type: 'all',
  account: 'all',
  dateFrom: '',
  dateTo: ''
};

// Initialize balances
Object.keys(ACCOUNTS).forEach(key => {
  appData.balances[key] = 0;
});

// =====================
// TOAST NOTIFICATIONS
// =====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '✅'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// =====================
// UTILITY FUNCTIONS
// =====================
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) num = 0;
  return Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
}

function updateDashboard() {
  const grid = document.getElementById('balanceGrid');
  if (!grid) return;
  grid.innerHTML = '';

  let total = 0;
  let bankTotal = 0;
  let walletTotal = 0;

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
// SEARCH & FILTER
// =====================
function applyFilters() {
  filterState.search = document.getElementById('searchInput')?.value?.trim().toLowerCase() || '';
  filterState.type = document.getElementById('filterType')?.value || 'all';
  filterState.account = document.getElementById('filterAccount')?.value || 'all';
  filterState.dateFrom = document.getElementById('filterDateFrom')?.value || '';
  filterState.dateTo = document.getElementById('filterDateTo')?.value || '';
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
    // Search in notes
    if (filterState.search) {
      const notesMatch = t.notes && t.notes.toLowerCase().includes(filterState.search);
      const amountMatch = t.amount.toString().includes(filterState.search);
      if (!notesMatch && !amountMatch) return false;
    }

    // Type filter
    if (filterState.type !== 'all' && t.type !== filterState.type) return false;

    // Account filter
    if (filterState.account !== 'all') {
      const fromMatch = t.accountFrom === filterState.account;
      const toMatch = t.accountTo === filterState.account;
      if (!fromMatch && !toMatch) return false;
    }

    // Date from
    if (filterState.dateFrom) {
      const txDate = new Date(t.date).toISOString().split('T')[0];
      if (txDate < filterState.dateFrom) return false;
    }

    // Date to
    if (filterState.dateTo) {
      const txDate = new Date(t.date).toISOString().split('T')[0];
      if (txDate > filterState.dateTo) return false;
    }

    return true;
  });
}

function renderFilteredTransactions() {
  const list = document.getElementById('transactionsList');
  const filtered = getFilteredTransactions();
  const countEl = document.getElementById('transactionsCount');

  if (countEl) {
    countEl.textContent = `${filtered.length} معاملة من أصل ${appData.transactions.length}`;
  }

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-state">لا توجد معاملات تطابق البحث</p>';
    return;
  }

  list.innerHTML = filtered.map(t => {
    const date = new Date(t.date);
    const dateStr = date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    let typeText = '', details = '', typeClass = '';
    if (t.type === 'income') {
      typeText = '💰 إيداع';
      typeClass = 'type-income';
      details = `إلى: ${ACCOUNTS[t.accountTo]?.name || t.accountTo}`;
    } else if (t.type === 'expense') {
      typeText = '💸 سحب';
      typeClass = 'type-expense';
      details = `من: ${ACCOUNTS[t.accountFrom]?.name || t.accountFrom}`;
    } else {
      typeText = '🔄 تحويل';
      typeClass = 'type-transfer';
      details = `من: ${ACCOUNTS[t.accountFrom]?.name || t.accountFrom} ← إلى: ${ACCOUNTS[t.accountTo]?.name || t.accountTo}`;
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
  if (!select || select.dataset.populated) return;
  select.innerHTML = '<option value="all">كل الحسابات</option>';
  Object.keys(ACCOUNTS).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = ACCOUNTS[key].name;
    select.appendChild(opt);
  });
  select.dataset.populated = 'true';
}

// =====================
// REPORT
// =====================
function updateReport() {
  const today = new Date().toLocaleDateString('ar-EG');
  let total = 0;
  Object.keys(ACCOUNTS).forEach(key => {
    const balance = appData.balances[key];
    if (balance !== undefined && balance !== null && !isNaN(balance)) {
      total += Number(balance);
    }
  });

  let html = `
    <div class="total-balance">
      <h2>التقرير اليومي — ${today}</h2>
      <div class="amount">${formatNumber(total)} جنيه</div>
    </div>
    <div class="report-section">
      <h3>🏦 الحسابات البنكية</h3>
  `;

  Object.keys(ACCOUNTS).forEach(key => {
    if (ACCOUNTS[key].type === 'bank') {
      const balance = appData.balances[key] || 0;
      html += `
        <div class="report-item">
          <span>${ACCOUNTS[key].name}</span>
          <strong>${formatNumber(balance)} جنيه</strong>
        </div>
      `;
    }
  });

  html += `</div><div class="report-section"><h3>📱 المحافظ الإلكترونية</h3>`;

  Object.keys(ACCOUNTS).forEach(key => {
    if (ACCOUNTS[key].type === 'wallet') {
      const balance = appData.balances[key] || 0;
      html += `
        <div class="report-item">
          <span>${ACCOUNTS[key].name}</span>
          <strong>${formatNumber(balance)} جنيه</strong>
        </div>
      `;
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
  const toGroup = document.getElementById('accountToGroup');

  if (type === 'income') {
    fromGroup.style.display = 'none';
    toGroup.style.display = 'block';
    document.querySelector('#accountToGroup label').textContent = 'إلى الحساب';
  } else if (type === 'expense') {
    fromGroup.style.display = 'block';
    toGroup.style.display = 'none';
    document.querySelector('#accountFromGroup label').textContent = 'من الحساب';
  } else {
    fromGroup.style.display = 'block';
    toGroup.style.display = 'block';
  }
}

function populateAccountSelects() {
  const fromSelect = document.getElementById('accountFrom');
  const toSelect = document.getElementById('accountTo');
  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';

  Object.keys(ACCOUNTS).forEach(key => {
    const option1 = document.createElement('option');
    option1.value = key;
    option1.textContent = ACCOUNTS[key].name;
    fromSelect.appendChild(option1);

    const option2 = option1.cloneNode(true);
    toSelect.appendChild(option2);
  });
}

// =====================
// TRANSACTION FUNCTIONS
// =====================
async function addTransaction() {
  const type = document.getElementById('transactionType').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const notes = document.getElementById('notes').value;
  const accountFrom = document.getElementById('accountFrom').value;
  const accountTo = document.getElementById('accountTo').value;

  if (!amount || amount <= 0) {
    showToast('من فضلك أدخل مبلغ صحيح', 'warning');
    return;
  }

  if (type === 'transfer' && accountFrom === accountTo) {
    showToast('لا يمكن التحويل إلى نفس الحساب', 'warning');
    return;
  }

  const transaction = {
    id: Date.now(),
    type,
    amount,
    notes,
    accountFrom: type !== 'income' ? accountFrom : null,
    accountTo: type !== 'expense' ? accountTo : null,
    date: new Date().toISOString()
  };

  if (type === 'income') {
    appData.balances[accountTo] += amount;
  } else if (type === 'expense') {
    if (appData.balances[accountFrom] < amount) {
      showToast('الرصيد غير كافي في هذا الحساب', 'error');
      return;
    }
    appData.balances[accountFrom] -= amount;
  } else if (type === 'transfer') {
    if (appData.balances[accountFrom] < amount) {
      showToast('الرصيد غير كافي في هذا الحساب', 'error');
      return;
    }
    appData.balances[accountFrom] -= amount;
    appData.balances[accountTo] += amount;
  }

  appData.transactions.unshift(transaction);
  const saved = await saveToDatabase();

  if (saved) {
    document.getElementById('amount').value = '';
    document.getElementById('notes').value = '';
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

  if (transaction.type === 'income') {
    appData.balances[transaction.accountTo] -= transaction.amount;
  } else if (transaction.type === 'expense') {
    appData.balances[transaction.accountFrom] += transaction.amount;
  } else if (transaction.type === 'transfer') {
    appData.balances[transaction.accountFrom] += transaction.amount;
    appData.balances[transaction.accountTo] -= transaction.amount;
  }

  appData.transactions = appData.transactions.filter(t => t.id !== id);
  await saveToDatabase();
  updateUI();
  showToast('تم حذف المعاملة', 'info');
}

// Confirm dialog using Promise
function showConfirmToast(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <p>${message}</p>
        <div class="confirm-buttons">
          <button class="btn-confirm-yes">نعم، احذف</button>
          <button class="btn-confirm-no">إلغاء</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('confirm-show'));

    overlay.querySelector('.btn-confirm-yes').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
    overlay.querySelector('.btn-confirm-no').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
  });
}

// =====================
// REPORT SHARE
// =====================
function shareReport() {
  const today = new Date().toLocaleDateString('ar-EG');
  const total = Object.values(appData.balances).reduce((a, b) => a + b, 0);

  let message = `📊 *التقرير اليومي*\n`;
  message += `📅 ${today}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `💰 *إجمالي الرصيد:*\n`;
  message += `${formatNumber(total)} جنيه\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `🏦 *الحسابات البنكية:*\n\n`;

  Object.keys(ACCOUNTS).forEach(key => {
    if (ACCOUNTS[key].type === 'bank') {
      message += `▪️ ${ACCOUNTS[key].name}\n`;
      message += ` ${formatNumber(appData.balances[key])} جنيه\n\n`;
    }
  });

  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `📱 *المحافظ الإلكترونية:*\n\n`;

  Object.keys(ACCOUNTS).forEach(key => {
    if (ACCOUNTS[key].type === 'wallet') {
      message += `▪️ ${ACCOUNTS[key].name}\n`;
      message += ` ${formatNumber(appData.balances[key])} جنيه\n\n`;
    }
  });

  message += `━━━━━━━━━━━━━━━━━━━━`;
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// =====================
// BACKUP FUNCTIONS
// =====================
function exportData() {
  const dataStr = JSON.stringify(appData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `treasury_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير البيانات بنجاح', 'success');
}

async function importData() {
  const file = document.getElementById('importFile').files[0];
  if (!file) {
    showToast('من فضلك اختر ملف للاستيراد', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      const confirmed = await showConfirmToast('سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟');
      if (confirmed) {
        appData = imported;
        await saveToDatabase();
        updateUI();
        showToast('تم استيراد البيانات بنجاح', 'success');
        showTab('dashboard');
      }
    } catch (error) {
      showToast('خطأ في قراءة الملف. تأكد من صحة الملف', 'error');
    }
  };
  reader.readAsText(file);
}

async function clearAllData() {
  const confirmed1 = await showConfirmToast('⚠️ سيتم حذف جميع البيانات نهائياً. هل أنت متأكد؟');
  if (!confirmed1) return;

  const confirmed2 = await showConfirmToast('هذا الإجراء لا يمكن التراجع عنه! تأكيد أخير؟');
  if (!confirmed2) return;

  appData = { balances: {}, transactions: [] };
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
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

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
  // Tab navigation
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      showTab(this.getAttribute('data-tab'));
    });
  });

  // Transaction type change
  document.getElementById('transactionType').addEventListener('change', updateFormFields);

  // Add transaction button
  document.getElementById('addTransactionBtn').addEventListener('click', addTransaction);

  // Share report button
  document.getElementById('shareReportBtn').addEventListener('click', shareReport);

  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportData);

  // Import button
  document.getElementById('importBtn').addEventListener('click', importData);

  // Clear button
  document.getElementById('clearBtn').addEventListener('click', clearAllData);

  // Search & Filter
  document.getElementById('searchInput')?.addEventListener('input', applyFilters);
  document.getElementById('filterType')?.addEventListener('change', applyFilters);
  document.getElementById('filterAccount')?.addEventListener('change', applyFilters);
  document.getElementById('filterDateFrom')?.addEventListener('change', applyFilters);
  document.getElementById('filterDateTo')?.addEventListener('change', applyFilters);
  document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);
}

// Start app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

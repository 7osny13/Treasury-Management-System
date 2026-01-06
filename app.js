// Treasury Management Application
// Main JavaScript File

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

// Initialize balances
Object.keys(ACCOUNTS).forEach(key => {
    appData.balances[key] = 0;
});

// Utility Functions
function formatNumber(num) {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function showSyncStatus(message, type) {
    const status = document.getElementById('syncStatus');
    status.textContent = message;
    status.className = `sync-status ${type}`;
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}

// Database Functions
async function saveToDatabase() {
    try {
        // Use upsert to handle insert/update automatically
        const { error } = await window.supabaseClient
            .from('treasury_data')
            .upsert({ 
                id: 1, // Use fixed ID so we always update the same record
                data: appData,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });

        if (error) throw error;

        showSyncStatus('✅ تم الحفظ والمزامنة بنجاح', 'success');
        return true;
    } catch (error) {
        console.error('Save error:', error);
        showSyncStatus('⚠️ خطأ في الحفظ: ' + error.message, 'error');
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

        if (error) {
            console.log('Load error:', error);
            return false;
        }

        if (data && data.length > 0 && data[0].data) {
            appData = data[0].data;
            updateUI();
            showSyncStatus('✅ تم تحميل البيانات من السحابة', 'success');
            return true;
        }

        console.log('No data in database yet');
        return false;
    } catch (error) {
        console.error('Load error:', error);
        showSyncStatus('⚠️ خطأ في التحميل: ' + error.message, 'error');
        return false;
    }
}

// UI Update Functions
function updateUI() {
    updateDashboard();
    updateTransactionsList();
    updateReport();
}

function updateDashboard() {
    const grid = document.getElementById('balanceGrid');
    grid.innerHTML = '';

    let total = 0;

    Object.keys(ACCOUNTS).forEach(key => {
        const balance = appData.balances[key] || 0;
        total += balance;

        const card = document.createElement('div');
        card.className = 'balance-card';
        card.innerHTML = `
            <h3>${ACCOUNTS[key].name}</h3>
            <div class="amount">${formatNumber(balance)} جنيه</div>
        `;
        grid.appendChild(card);
    });

    document.getElementById('totalBalance').textContent = `${formatNumber(total)} جنيه`;
}

function updateTransactionsList() {
    const list = document.getElementById('transactionsList');
    
    if (appData.transactions.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">لا توجد معاملات بعد</p>';
        return;
    }

    list.innerHTML = appData.transactions.map(t => {
        const date = new Date(t.date);
        const dateStr = date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG', {hour: '2-digit', minute: '2-digit'});
        
        let typeText = '';
        let details = '';
        
        if (t.type === 'income') {
            typeText = '💰 إيداع';
            details = `إلى: ${ACCOUNTS[t.accountTo].name}`;
        } else if (t.type === 'expense') {
            typeText = '💸 سحب';
            details = `من: ${ACCOUNTS[t.accountFrom].name}`;
        } else {
            typeText = '🔄 تحويل';
            details = `من: ${ACCOUNTS[t.accountFrom].name} → إلى: ${ACCOUNTS[t.accountTo].name}`;
        }

        return `
            <div class="transaction-item ${t.type}">
                <div class="transaction-header">
                    <span class="transaction-type">${typeText}</span>
                    <span class="transaction-amount">${formatNumber(t.amount)} جنيه</span>
                </div>
                <div class="transaction-details">${details}</div>
                ${t.notes ? `<div class="transaction-details">📝 ${t.notes}</div>` : ''}
                <div class="transaction-date">${dateStr}</div>
                <button class="delete-btn" onclick="deleteTransaction(${t.id})">حذف</button>
            </div>
        `;
    }).join('');
}

function updateReport() {
    const today = new Date().toLocaleDateString('ar-EG');
    let html = `
        <div class="total-balance">
            <h2>التقرير اليومي - ${today}</h2>
            <div class="amount">${formatNumber(Object.values(appData.balances).reduce((a, b) => a + b, 0))} جنيه</div>
        </div>
        <div class="report-section">
            <h3>🏦 الحسابات البنكية</h3>
    `;

    Object.keys(ACCOUNTS).forEach(key => {
        if (ACCOUNTS[key].type === 'bank') {
            html += `
                <div class="report-item">
                    <span>${ACCOUNTS[key].name}</span>
                    <strong>${formatNumber(appData.balances[key])} جنيه</strong>
                </div>
            `;
        }
    });

    html += `</div><div class="report-section"><h3>📱 المحافظ الإلكترونية</h3>`;

    Object.keys(ACCOUNTS).forEach(key => {
        if (ACCOUNTS[key].type === 'wallet') {
            html += `
                <div class="report-item">
                    <span>${ACCOUNTS[key].name}</span>
                    <strong>${formatNumber(appData.balances[key])} جنيه</strong>
                </div>
            `;
        }
    });

    html += `</div>`;

    document.getElementById('reportContent').innerHTML = html;
}

// Form Functions
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
        
        const option2 = document.createElement('option');
        option2.value = key;
        option2.textContent = ACCOUNTS[key].name;
        toSelect.appendChild(option2);
    });
}

// Transaction Functions
async function addTransaction() {
    const type = document.getElementById('transactionType').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const notes = document.getElementById('notes').value;
    const accountFrom = document.getElementById('accountFrom').value;
    const accountTo = document.getElementById('accountTo').value;

    if (!amount || amount <= 0) {
        alert('من فضلك أدخل مبلغ صحيح');
        return;
    }

    if (type === 'transfer' && accountFrom === accountTo) {
        alert('لا يمكن التحويل إلى نفس الحساب');
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

    // Update balances
    if (type === 'income') {
        appData.balances[accountTo] += amount;
    } else if (type === 'expense') {
        if (appData.balances[accountFrom] < amount) {
            alert('الرصيد غير كافي في هذا الحساب');
            return;
        }
        appData.balances[accountFrom] -= amount;
    } else if (type === 'transfer') {
        if (appData.balances[accountFrom] < amount) {
            alert('الرصيد غير كافي في هذا الحساب');
            return;
        }
        appData.balances[accountFrom] -= amount;
        appData.balances[accountTo] += amount;
    }

    appData.transactions.unshift(transaction);
    
    const saved = await saveToDatabase();
    if (saved) {
        // Clear form
        document.getElementById('amount').value = '';
        document.getElementById('notes').value = '';

        // Update UI
        updateUI();

        alert('تم حفظ المعاملة بنجاح');
        showTab('dashboard');
    }
}

async function deleteTransaction(id) {
    if (!confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
        return;
    }

    const transaction = appData.transactions.find(t => t.id === id);
    if (!transaction) return;

    // Reverse the transaction effect on balances
    if (transaction.type === 'income') {
        appData.balances[transaction.accountTo] -= transaction.amount;
    } else if (transaction.type === 'expense') {
        appData.balances[transaction.accountFrom] += transaction.amount;
    } else if (transaction.type === 'transfer') {
        appData.balances[transaction.accountFrom] += transaction.amount;
        appData.balances[transaction.accountTo] -= transaction.amount;
    }

    // Remove transaction
    appData.transactions = appData.transactions.filter(t => t.id !== id);
    
    await saveToDatabase();
    updateUI();
}

// Report Functions
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
            message += `   ${formatNumber(appData.balances[key])} جنيه\n\n`;
        }
    });

    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📱 *المحافظ الإلكترونية:*\n\n`;

    Object.keys(ACCOUNTS).forEach(key => {
        if (ACCOUNTS[key].type === 'wallet') {
            message += `▪️ ${ACCOUNTS[key].name}\n`;
            message += `   ${formatNumber(appData.balances[key])} جنيه\n\n`;
        }
    });

    message += `━━━━━━━━━━━━━━━━━━━━`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Backup Functions
function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treasury_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('تم تصدير البيانات بنجاح');
}

async function importData() {
    const file = document.getElementById('importFile').files[0];
    if (!file) {
        alert('من فضلك اختر ملف للاستيراد');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm('هل أنت متأكد؟ سيتم استبدال جميع البيانات الحالية')) {
                appData = imported;
                await saveToDatabase();
                updateUI();
                alert('تم استيراد البيانات بنجاح');
                showTab('dashboard');
            }
        } catch (error) {
            alert('خطأ في قراءة الملف. تأكد من صحة الملف');
        }
    };
    reader.readAsText(file);
}

async function clearAllData() {
    if (confirm('⚠️ تحذير: سيتم حذف جميع البيانات نهائياً. هل أنت متأكد؟')) {
        if (confirm('هذا الإجراء لا يمكن التراجع عنه! هل أنت متأكد تماماً؟')) {
            appData = {
                balances: {},
                transactions: []
            };
            Object.keys(ACCOUNTS).forEach(key => {
                appData.balances[key] = 0;
            });
            await saveToDatabase();
            updateUI();
            alert('تم حذف جميع البيانات');
            showTab('dashboard');
        }
    }
}

// Tab Navigation
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    document.getElementById(tabName).classList.add('active');
}

// Initialize Application
async function init() {
    console.log('Initializing Treasury Management System...');
    
    // Load data from database
    await loadFromDatabase();
    
    // Populate form selects
    populateAccountSelects();
    updateFormFields();
    
    // Update UI
    updateUI();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Application initialized successfully');
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showTab(tabName);
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
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

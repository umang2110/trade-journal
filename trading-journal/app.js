// ==================== AUTH SYSTEM ====================
const Auth = {
    getUsers() { try { return JSON.parse(localStorage.getItem('tj_users')) || {}; } catch { return {}; } },
    saveUsers(u) { localStorage.setItem('tj_users', JSON.stringify(u)); },
    getCurrentUser() { return localStorage.getItem('tj_current_user') || ''; },
    setCurrentUser(u) { localStorage.setItem('tj_current_user', u); },
    hashPass(p) { let h = 0; for (let i = 0; i < p.length; i++) { h = ((h << 5) - h) + p.charCodeAt(i); h |= 0; } return String(h); },
    signup(username, password) {
        if (!username || !password) return 'Please enter username and password';
        if (username.length < 3) return 'Username must be at least 3 characters';
        if (password.length < 4) return 'Password must be at least 4 characters';
        const users = this.getUsers();
        if (users[username]) return 'Username already exists';
        users[username] = { hash: this.hashPass(password), created: Date.now() };
        this.saveUsers(users);
        this.setCurrentUser(username);
        return null;
    },
    login(username, password) {
        if (!username || !password) return 'Please enter username and password';
        const users = this.getUsers();
        if (!users[username]) return 'Username not found';
        if (users[username].hash !== this.hashPass(password)) return 'Wrong password';
        this.setCurrentUser(username);
        return null;
    },
    logout() { localStorage.removeItem('tj_current_user'); },
    isLoggedIn() { return !!this.getCurrentUser(); }
};

// ==================== DATA STORE (User-Scoped) ====================
const Store = {
    _key(key) { return `tj_${Auth.getCurrentUser()}_${key}`; },
    get(key, fallback = null) {
        try { return JSON.parse(localStorage.getItem(this._key(key))) || fallback; } catch { return fallback; }
    },
    set(key, val) { localStorage.setItem(this._key(key), JSON.stringify(val)); },
    getTrades() { return this.get('trades', []); },
    setTrades(t) { this.set('trades', t); },
    getRules() {
        return this.get('rules', {
            'Situational Awareness': [
                { text: 'Uptrend Market', good: true },
                { text: 'Strong Sector', good: true },
                { text: 'Bad Fundamental', good: false }
            ],
            'Entry Triggers': [
                { text: 'Low Cheat Entry', good: true },
                { text: 'Horizontal BO', good: true },
                { text: 'Emotional Buy', good: false }
            ],
            'Risk Management': [
                { text: 'SL followed', good: true },
                { text: 'Calculated Risk', good: true },
                { text: 'SL Not followed', good: false }
            ],
            'Exit Triggers': [
                { text: 'Broke Key MAs', good: true },
                { text: 'Panic Sell', good: false },
                { text: 'Early Sell off', good: false }
            ]
        });
    },
    setRules(r) { this.set('rules', r); }
};

// ==================== AUTH UI ====================
let authIsSignup = false;

function initAuth() {
    if (Auth.isLoggedIn()) {
        document.getElementById('auth-overlay').classList.add('hidden');
        startApp();
        return;
    }
    document.getElementById('auth-overlay').classList.remove('hidden');
}

document.getElementById('auth-toggle')?.addEventListener('click', (e) => {
    e.preventDefault();
    authIsSignup = !authIsSignup;
    document.getElementById('auth-title').textContent = authIsSignup ? 'Sign Up' : 'Login';
    document.getElementById('btn-auth-submit').innerHTML = authIsSignup
        ? '<i class="fas fa-user-plus"></i> Sign Up'
        : '<i class="fas fa-sign-in-alt"></i> Login';
    document.getElementById('auth-toggle').textContent = authIsSignup ? 'Login' : 'Sign Up';
    document.getElementById('auth-switch').firstChild.textContent = authIsSignup
        ? 'Already have an account? ' : "Don't have an account? ";
    document.getElementById('auth-error').classList.add('hidden');
});

document.getElementById('btn-auth-submit')?.addEventListener('click', () => {
    const user = document.getElementById('auth-username').value.trim().toLowerCase();
    const pass = document.getElementById('auth-password').value;
    const err = authIsSignup ? Auth.signup(user, pass) : Auth.login(user, pass);
    const errEl = document.getElementById('auth-error');
    if (err) {
        errEl.textContent = err;
        errEl.classList.remove('hidden');
    } else {
        errEl.classList.add('hidden');
        document.getElementById('auth-overlay').classList.add('hidden');
        startApp();
        showToast(authIsSignup ? 'Account created! Welcome!' : 'Welcome back!');
    }
});

// Enter key support
document.getElementById('auth-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-auth-submit').click();
});

// Logout
document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (!confirm('Are you sure you want to logout?')) return;
    Auth.logout();
    location.reload(); // Full page reload clears all DOM state and ensures clean login
});

// ==================== TOAST ====================
function showToast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    t.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ==================== NAVIGATION ====================
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

function navigateTo(pageId) {
    navItems.forEach(n => n.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
    document.getElementById(`page-${pageId}`)?.classList.add('active');
    if (pageId === 'dashboard') updateDashboard();
    if (pageId === 'manage-trades') renderManageTrades();
    if (pageId === 'open-positions') renderOpenPositions();
    if (pageId === 'trade-diary') renderTradeDiary();
    if (pageId === 'position-manager') renderPositionManager();
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.page);
    });
});

// Mobile menu toggle
document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ==================== RULE BOOK ====================
function renderRuleBook() {
    const rules = Store.getRules();
    const grid = document.getElementById('rulebook-grid');
    grid.innerHTML = '';
    Object.entries(rules).forEach(([category, items]) => {
        const card = document.createElement('div');
        card.className = 'rule-card';
        let itemsHtml = items.map((item, i) => `
            <div class="rule-item">
                <span class="rule-item-text">${item.text}</span>
                <div class="rule-actions">
                    <button class="rule-btn rule-btn-good ${item.good ? 'active' : ''}" onclick="toggleRule('${category}',${i},true)"><i class="fas fa-check"></i></button>
                    <button class="rule-btn rule-btn-bad ${!item.good ? 'active' : ''}" onclick="toggleRule('${category}',${i},false)"><i class="fas fa-times"></i></button>
                    <button class="rule-btn rule-btn-delete" onclick="deleteRule('${category}',${i})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
        card.innerHTML = `<h3>${category}</h3>${itemsHtml}
            <div class="rule-add-btn" onclick="addRule('${category}')"><i class="fas fa-plus"></i> Add Rule</div>`;
        grid.appendChild(card);
    });
}

function toggleRule(cat, idx, good) {
    const rules = Store.getRules();
    if (rules[cat] && rules[cat][idx]) { rules[cat][idx].good = good; Store.setRules(rules); renderRuleBook(); }
}

function deleteRule(cat, idx) {
    const rules = Store.getRules();
    if (rules[cat]) { rules[cat].splice(idx, 1); Store.setRules(rules); renderRuleBook(); showToast('Rule deleted', 'info'); }
}

function addRule(cat) {
    const text = prompt('Enter new rule:');
    if (text && text.trim()) {
        const rules = Store.getRules();
        if (!rules[cat]) rules[cat] = [];
        rules[cat].push({ text: text.trim(), good: true });
        Store.setRules(rules);
        renderRuleBook();
        showToast('Rule added!');
    }
}

document.getElementById('btn-save-rules').addEventListener('click', () => {
    showToast('Rules saved successfully!');
});

// ==================== ADD TRADES ====================
// File input display
document.getElementById('tradebook-file')?.addEventListener('change', function () {
    document.getElementById('tradebook-name').textContent = this.files[0]?.name || 'No file chosen';
});
document.getElementById('pnl-file')?.addEventListener('change', function () {
    document.getElementById('pnl-name').textContent = this.files[0]?.name || 'No file chosen';
});


// ==================== BROKER FILE IMPORT ====================

// --- Broker column mappings ---
const BROKER_SCHEMAS = {
    zerodha: {
        detect: h => (h.includes('trade date') || h.includes('trade_date')) && (h.includes('trade type') || h.includes('trade_type')),
        symbol: row => row['Symbol'] || row['symbol'] || '',
        date:   row => row['Trade Date'] || row['trade_date'] || '',
        price:  row => parseFloat(row['Price'] || row['price'] || 0),
        qty:    row => parseInt(row['Quantity'] || row['quantity'] || 0),
        side:   row => (row['Trade Type'] || row['trade_type'] || '').toUpperCase(),
    },
    angelone: {
        detect: h => h.includes('order date') || (h.includes('symbol') && h.includes('buy/sell')),
        symbol: row => row['Symbol'] || row['symbol'] || '',
        date:   row => row['Order Date'] || row['Date'] || '',
        price:  row => parseFloat(row['Price'] || row['Avg Price'] || 0),
        qty:    row => parseInt(row['Qty'] || row['Quantity'] || 0),
        side:   row => (row['Buy/Sell'] || row['Side'] || '').toUpperCase(),
    },
    groww: {
        detect: h => h.includes('stock/etf') || h.includes('price per share'),
        symbol: row => row['Stock/ETF name'] || row['Symbol'] || '',
        date:   row => row['Date'] || '',
        price:  row => parseFloat(String(row['Price Per Share'] || row['Price'] || '0').replace(/[₹,]/g,'')),
        qty:    row => parseInt(row['Quantity'] || 0),
        side:   row => { const t = (row['Transaction Type'] || '').toUpperCase(); return t.includes('BUY') ? 'BUY' : 'SELL'; },
    },
    upstox: {
        detect: h => h.includes('instrument name') || h.includes('average price'),
        symbol: row => row['Instrument Name'] || row['Symbol'] || row['symbol'] || '',
        date:   row => row['Order Execution Time'] || row['Date'] || row['date'] || '',
        price:  row => parseFloat(row['Average Price'] || row['Price'] || row['price'] || 0),
        qty:    row => parseInt(row['Quantity'] || row['quantity'] || 0),
        side:   row => (row['Transaction Type'] || row['Buy/Sell'] || row['Side'] || '').toUpperCase(),
    },
    generic: {
        detect: () => true,
        symbol: row => smartFind(row, ['symbol','scrip','stock','instrument','ticker','name','script name','scrip name']),
        date:   row => smartFind(row, ['date','trade date','trade_date','order date','execution time','order execution time']),
        price:  row => parseFloat(String(smartFind(row, ['price','avg price','average price','rate','price per share']) || '0').replace(/[₹,]/g,'')) || 0,
        qty:    row => parseInt(smartFind(row, ['quantity','qty','vol','volume','shares','lots']) || '0') || 0,
        side:   row => {
            const v = (smartFind(row, ['trade type','trade_type','buy/sell','transaction type','side','type','transaction','action']) || 'BUY').toUpperCase();
            return v.includes('SELL') ? 'SELL' : 'BUY';
        },
    }
};

// Smart fuzzy column finder — searches row keys for best match
function smartFind(row, keywords) {
    const keys = Object.keys(row);
    // Exact case-insensitive match first
    for (const kw of keywords) {
        for (const k of keys) {
            if (k.toLowerCase().trim() === kw) return row[k];
        }
    }
    // Partial match
    for (const kw of keywords) {
        for (const k of keys) {
            if (k.toLowerCase().trim().includes(kw) || kw.includes(k.toLowerCase().trim())) return row[k];
        }
    }
    return '';
}

function detectBroker(headers) {
    const h = headers.map(x => (x || '').toLowerCase().trim()).join(' ');
    for (const [name, schema] of Object.entries(BROKER_SCHEMAS)) {
        if (name !== 'generic' && schema.detect(h)) return name;
    }
    return 'generic';
}

// --- Keywords to detect the real header row ---
const HEADER_KEYWORDS = ['symbol','trade date','trade_date','date','price','quantity','qty','trade type','trade_type','buy/sell','transaction','instrument','stock','scrip','script name'];

function findHeaderRow(allRows) {
    for (let i = 0; i < Math.min(allRows.length, 30); i++) {
        const row = allRows[i];
        const cells = row.map(c => String(c || '').toLowerCase().trim());
        const joined = cells.join(' ');
        let matches = 0;
        for (const kw of HEADER_KEYWORDS) {
            if (joined.includes(kw)) matches++;
        }
        if (matches >= 3) return i; // Found header row
    }
    return 0; // Fallback to first row
}

// --- Parse file bytes to array of row objects ---
function parseFileToRows(file) {
    return new Promise((resolve, reject) => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    // Get ALL rows as raw arrays first
                    const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                    // Find real header row
                    const headerIdx = findHeaderRow(allRows);
                    const headers = allRows[headerIdx].map(h => String(h || '').trim());
                    // Build row objects from data rows
                    const data = [];
                    for (let i = headerIdx + 1; i < allRows.length; i++) {
                        const row = allRows[i];
                        if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;
                        const obj = {};
                        headers.forEach((h, j) => { if (h) obj[h] = row[j] !== undefined ? row[j] : ''; });
                        data.push(obj);
                    }
                    resolve(data);
                } catch(err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        } else {
            // For CSV, also try to skip metadata rows
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: res => {
                    const allRows = res.data;
                    const headerIdx = findHeaderRow(allRows);
                    const headers = allRows[headerIdx].map(h => String(h || '').trim());
                    const data = [];
                    for (let i = headerIdx + 1; i < allRows.length; i++) {
                        const row = allRows[i];
                        if (!row || row.every(c => !c)) continue;
                        const obj = {};
                        headers.forEach((h, j) => { if (h) obj[h] = row[j] !== undefined ? row[j] : ''; });
                        data.push(obj);
                    }
                    resolve(data);
                },
                error: reject
            });
        }
    });
}

// --- Normalize all rows to standard format ---
function normalizeRows(rows, brokerName) {
    const schema = BROKER_SCHEMAS[brokerName] || BROKER_SCHEMAS.generic;
    return rows.map(row => {
        const sym = (schema.symbol(row) || '').trim().toUpperCase();
        const dateRaw = schema.date(row) || '';
        const price = schema.price(row) || 0;
        const qty = schema.qty(row) || 0;
        const side = schema.side(row) || 'BUY';
        return { symbol: sym, date: normalizeDate(dateRaw), price, qty, side };
    }).filter(r => r.symbol && r.price > 0 && r.qty > 0);
}

function normalizeDate(raw) {
    if (!raw) return '';
    raw = String(raw).trim();
    // dd-mm-yyyy or dd/mm/yyyy
    if (/^\d{2}[-\/]\d{2}[-\/]\d{4}/.test(raw)) {
        const [d, m, y] = raw.split(/[-\/]/);
        return `${y}-${m}-${d}`;
    }
    // yyyy-mm-dd already
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    // Excel serial number
    if (/^\d{5}$/.test(raw)) {
        const d = new Date(Math.round((parseInt(raw) - 25569) * 86400 * 1000));
        return d.toISOString().slice(0, 10);
    }
    // Try parsing whatever the browser supports
    const d = new Date(raw);
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

// --- Pair BUY + SELL orders by symbol into complete trades ---
// Logic: sort by date, match each BUY to the next SELL for the same symbol
function pairTrades(rows) {
    const bySymbol = {};
    rows.forEach(r => {
        if (!bySymbol[r.symbol]) bySymbol[r.symbol] = { buys: [], sells: [] };
        if (r.side === 'BUY') bySymbol[r.symbol].buys.push(r);
        else bySymbol[r.symbol].sells.push(r);
    });

    const paired = [];
    const openTrades = [];

    Object.entries(bySymbol).forEach(([symbol, { buys, sells }]) => {
        // Sort both by date
        buys.sort((a, b) => new Date(a.date) - new Date(b.date));
        sells.sort((a, b) => new Date(a.date) - new Date(b.date));

        const sellQueue = [...sells];
        buys.forEach(buy => {
            // Find first sell after or on the same day
            const sellIdx = sellQueue.findIndex(s => s.date >= buy.date);
            if (sellIdx >= 0) {
                const sell = sellQueue.splice(sellIdx, 1)[0];
                const pnl = (sell.price - buy.price) * buy.qty;
                const pnlPct = buy.price ? ((sell.price - buy.price) / buy.price * 100) : 0;
                paired.push({
                    id: Date.now() + Math.random(),
                    symbol, broker: document.getElementById('broker-select').value,
                    type: 'Buy',
                    entryDate: buy.date, entryPrice: buy.price, entryQty: buy.qty,
                    exitDate: sell.date, exitPrice: sell.price, exitQty: sell.qty,
                    sl: 5, status: 'Closed', notes: '', pnl, pnlPct
                });
            } else {
                // No matching sell — open position
                openTrades.push({
                    id: Date.now() + Math.random(),
                    symbol, broker: document.getElementById('broker-select').value,
                    type: 'Buy',
                    entryDate: buy.date, entryPrice: buy.price, entryQty: buy.qty,
                    exitDate: '', exitPrice: 0, exitQty: 0,
                    sl: 5, status: 'Open', notes: '', pnl: 0, pnlPct: 0
                });
            }
        });
    });

    return [...paired, ...openTrades];
}

// --- Deduplicate: skip trades already in store ---
function deduplicateTrades(newTrades, existing) {
    const existingKeys = new Set(existing.map(t =>
        `${t.symbol}_${t.entryDate}_${t.entryPrice}_${t.entryQty}`
    ));
    const added = [], skipped = [];
    newTrades.forEach(t => {
        const key = `${t.symbol}_${t.entryDate}_${t.entryPrice}_${t.entryQty}`;
        if (existingKeys.has(key)) skipped.push(t);
        else added.push(t);
    });
    return { added, skipped };
}

// --- Show import result panel ---
function showImportResult(added, skipped, errors) {
    const panel = document.getElementById('import-result');
    const header = document.getElementById('import-result-header');
    const body = document.getElementById('import-result-body');
    panel.classList.remove('hidden');

    const total = added.length + skipped.length;
    if (errors.length > 0 && added.length === 0) {
        header.className = 'import-result-header error';
        header.innerHTML = `<i class="fas fa-exclamation-circle"></i> Import Failed`;
        body.innerHTML = `<ul>${errors.map(e => `<li class="err">${e}</li>`).join('')}</ul>`;
        return;
    }

    header.className = added.length > 0 ? 'import-result-header success' : 'import-result-header warning';
    header.innerHTML = `<i class="fas fa-${added.length > 0 ? 'check-circle' : 'exclamation-triangle'}"></i>
        Imported <strong>${added.length}</strong> trade${added.length !== 1 ? 's' : ''},
        ${skipped.length} duplicate${skipped.length !== 1 ? 's' : ''} skipped`;

    const addedSymbols = [...new Set(added.map(t => t.symbol))];
    const lines = addedSymbols.map(sym => {
        const n = added.filter(t => t.symbol === sym).length;
        return `<li class="ok"><i class="fas fa-check" style="font-size:.7rem;margin-right:4px"></i> ${sym} — ${n} trade${n>1?'s':''} imported</li>`;
    });
    if (skipped.length) lines.push(`<li class="skip"><i class="fas fa-forward" style="font-size:.7rem;margin-right:4px"></i> ${skipped.length} duplicate trade${skipped.length>1?'s':''} skipped</li>`);
    if (errors.length) lines.push(...errors.map(e => `<li class="err">${e}</li>`));
    body.innerHTML = `<ul>${lines.join('')}</ul>`;
}

// --- Main import handler ---
document.getElementById('btn-process-files')?.addEventListener('click', async () => {
    const tbFile = document.getElementById('tradebook-file').files[0];
    if (!tbFile) {
        showToast('Please choose a tradebook file first', 'error');
        return;
    }

    const btn = document.getElementById('btn-process-files');
    btn.disabled = true;
    btn.innerHTML = `<span class="import-spinner"></span> Processing...`;

    const errors = [];
    let added = [], skipped = [];

    try {
        const rows = await parseFileToRows(tbFile);
        if (!rows || rows.length === 0) throw new Error('File is empty or could not be parsed.');

        const headers = Object.keys(rows[0]);
        const brokerName = detectBroker(headers);
        showToast(`Detected: ${brokerName.charAt(0).toUpperCase() + brokerName.slice(1)} format`, 'info');

        const normalized = normalizeRows(rows, brokerName);
        if (normalized.length === 0) throw new Error('No valid trade rows found. Check column names match your broker format.');

        const paired = pairTrades(normalized);
        const existing = Store.getTrades();
        const result = deduplicateTrades(paired, existing);
        added = result.added;
        skipped = result.skipped;

        // Save to store
        const updatedTrades = [...added, ...existing];
        Store.setTrades(updatedTrades);

        if (added.length > 0) showToast(`${added.length} trades imported successfully!`);
        else showToast('No new trades to import (all duplicates)', 'info');

    } catch (err) {
        errors.push(err.message || String(err));
        showToast('Import failed: ' + errors[0], 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-cogs"></i> Process &amp; Import`;
        showImportResult(added, skipped, errors);
    }
});

document.getElementById('btn-create-empty')?.addEventListener('click', () => {
    showToast('Empty tradebook created!');
});


document.getElementById('btn-add-manual')?.addEventListener('click', () => {
    const symbol = document.getElementById('manual-symbol').value.trim().toUpperCase();
    const entryPrice = parseFloat(document.getElementById('manual-entry-price').value);
    const entryQty = parseInt(document.getElementById('manual-entry-qty').value);
    const entryDate = document.getElementById('manual-entry-date').value;
    const exitPrice = parseFloat(document.getElementById('manual-exit-price').value) || 0;
    const exitQty = parseInt(document.getElementById('manual-exit-qty').value) || 0;
    const exitDate = document.getElementById('manual-exit-date').value || '';
    const sl = parseFloat(document.getElementById('manual-sl').value) || 5;
    const status = document.getElementById('manual-status').value;
    const notes = document.getElementById('manual-notes').value;

    if (!symbol || !entryPrice || !entryQty || !entryDate) {
        showToast('Please fill symbol, entry price, qty and date', 'error');
        return;
    }

    const pnl = exitPrice ? ((exitPrice - entryPrice) * entryQty) : 0;
    const pnlPct = exitPrice ? (((exitPrice - entryPrice) / entryPrice) * 100) : 0;

    const trade = {
        id: Date.now(),
        symbol, entryPrice, entryQty, entryDate,
        exitPrice, exitQty, exitDate,
        sl, status, notes, pnl, pnlPct,
        type: document.getElementById('manual-type').value,
        broker: document.getElementById('broker-select').value
    };

    const trades = Store.getTrades();
    trades.unshift(trade);
    Store.setTrades(trades);

    // Clear form
    ['manual-symbol','manual-entry-price','manual-entry-qty','manual-entry-date','manual-exit-price','manual-exit-qty','manual-exit-date','manual-sl','manual-notes'].forEach(id => {
        document.getElementById(id).value = '';
    });

    showToast(`Trade ${symbol} added successfully!`);
});

// ==================== MANAGE TRADES ====================
function renderManageTrades() {
    const trades = Store.getTrades().filter(t => t.status === 'Closed' || t.exitPrice > 0);
    const search = document.getElementById('manage-search')?.value.toLowerCase() || '';
    const filtered = trades.filter(t => !search || t.symbol.toLowerCase().includes(search));
    const body = document.getElementById('manage-trades-body');
    const noData = document.getElementById('manage-no-data');

    if (filtered.length === 0) {
        body.innerHTML = '';
        noData.style.display = 'block';
        return;
    }
    noData.style.display = 'none';

    body.innerHTML = filtered.map(t => {
        const pnlClass = t.pnl >= 0 ? 'green' : 'red';
        const potentialPnl = t.sl ? (t.entryPrice * t.entryQty * t.sl / 100).toFixed(2) : 'N/A';
        return `<tr>
            <td><strong>${t.symbol}</strong></td>
            <td>${t.entryQty}</td><td>₹${t.entryPrice.toFixed(2)}</td><td>${t.entryDate}</td>
            <td>${t.exitQty || t.entryQty}</td><td>₹${t.exitPrice ? t.exitPrice.toFixed(2) : '-'}</td><td>${t.exitDate || '-'}</td>
            <td class="${pnlClass}">${t.pnlPct.toFixed(2)}% (₹${t.pnl.toFixed(2)})</td>
            <td>₹${potentialPnl}</td>
            <td>
                <button class="btn-icon" onclick="viewTrade(${t.id})" title="View Details"><i class="fas fa-eye" style="color:#448aff"></i></button>
                <button class="btn-icon" onclick="editTrade(${t.id})" title="Edit"><i class="fas fa-pen" style="color:var(--primary)"></i></button>
                <button class="btn-icon" onclick="deleteTrade(${t.id})" title="Delete"><i class="fas fa-trash" style="color:var(--danger)"></i></button>
            </td>
        </tr>`;
    }).join('');
}

document.getElementById('manage-search')?.addEventListener('input', renderManageTrades);

document.getElementById('btn-add-new-trade')?.addEventListener('click', () => navigateTo('add-trades'));

// --- View Individual Trade Detail ---
function viewTrade(id) {
    const trades = Store.getTrades();
    const t = trades.find(tr => tr.id === id);
    if (!t) return;

    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = `${t.symbol} — Trade Detail`;

    const pnlColor = t.pnl >= 0 ? '#00c853' : '#ef5350';
    const pnlSign = t.pnl >= 0 ? '+' : '';
    const daysHeld = t.exitDate && t.entryDate ? Math.floor((new Date(t.exitDate) - new Date(t.entryDate)) / 86400000) : t.entryDate ? Math.floor((Date.now() - new Date(t.entryDate).getTime()) / 86400000) : 0;
    const riskAmt = t.sl ? (t.entryPrice * t.entryQty * t.sl / 100) : 0;
    const rMultiple = riskAmt ? (t.pnl / riskAmt).toFixed(2) : 'N/A';

    body.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px">
            <div style="background:#f8f9fb;border-radius:10px;padding:14px;border:1px solid #e0e3e8">
                <div style="font-size:.72rem;color:#8892a0;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Entry</div>
                <div style="font-size:1.1rem;font-weight:700;margin-top:4px">₹${t.entryPrice.toFixed(2)}</div>
                <div style="font-size:.8rem;color:#8892a0">${t.entryQty} qty • ${t.entryDate}</div>
            </div>
            <div style="background:#f8f9fb;border-radius:10px;padding:14px;border:1px solid #e0e3e8">
                <div style="font-size:.72rem;color:#8892a0;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Exit</div>
                <div style="font-size:1.1rem;font-weight:700;margin-top:4px">${t.exitPrice ? '₹' + t.exitPrice.toFixed(2) : '—  Open'}</div>
                <div style="font-size:.8rem;color:#8892a0">${t.exitQty || t.entryQty} qty • ${t.exitDate || 'Still holding'}</div>
            </div>
        </div>
        <div style="background:${t.pnl >= 0 ? 'rgba(0,200,83,0.06)' : 'rgba(239,83,80,0.06)'};border-radius:10px;padding:16px;border:1px solid ${t.pnl >= 0 ? '#c8e6c9' : '#ffcdd2'};text-align:center;margin-bottom:18px">
            <div style="font-size:.72rem;color:#8892a0;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Profit / Loss</div>
            <div style="font-size:1.6rem;font-weight:800;color:${pnlColor};margin-top:4px">${pnlSign}₹${t.pnl.toFixed(2)}</div>
            <div style="font-size:.9rem;color:${pnlColor};font-weight:600">${pnlSign}${t.pnlPct.toFixed(2)}%</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
            <div style="text-align:center"><div style="font-size:.65rem;color:#8892a0;font-weight:600;text-transform:uppercase">Days Held</div><div style="font-size:1rem;font-weight:700">${daysHeld}d</div></div>
            <div style="text-align:center"><div style="font-size:.65rem;color:#8892a0;font-weight:600;text-transform:uppercase">SL %</div><div style="font-size:1rem;font-weight:700">${t.sl || 'N/A'}%</div></div>
            <div style="text-align:center"><div style="font-size:.65rem;color:#8892a0;font-weight:600;text-transform:uppercase">R-Multiple</div><div style="font-size:1rem;font-weight:700;color:${pnlColor}">${rMultiple}R</div></div>
            <div style="text-align:center"><div style="font-size:.65rem;color:#8892a0;font-weight:600;text-transform:uppercase">Risk ₹</div><div style="font-size:1rem;font-weight:700">₹${riskAmt.toFixed(0)}</div></div>
        </div>
        <div style="margin-bottom:10px"><span style="font-size:.85rem;font-weight:700">Price Movement</span></div>
        <div style="height:180px;position:relative"><canvas id="view-trade-chart"></canvas></div>
        ${t.notes ? `<div style="margin-top:14px;padding:12px;background:#f8f9fb;border-radius:8px;border:1px solid #e0e3e8;font-size:.83rem;color:#555"><i class="fas fa-sticky-note" style="margin-right:6px;color:var(--primary)"></i>${t.notes}</div>` : ''}
        <div style="margin-top:16px;text-align:right">
            <button class="btn btn-outline" id="btn-view-close"><i class="fas fa-times"></i> Close</button>
        </div>`;

    modal.classList.remove('hidden');

    document.getElementById('btn-view-close').addEventListener('click', () => modal.classList.add('hidden'));

    // Draw individual trade chart
    requestAnimationFrame(() => {
        const ctx = document.getElementById('view-trade-chart');
        if (!ctx || typeof Chart === 'undefined') return;
        const entry = t.entryPrice;
        const exit = t.exitPrice || entry;
        const steps = 30;
        const labels = [];
        const data = [];
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const base = entry + (exit - entry) * progress;
            const noise = (Math.random() - 0.5) * entry * 0.015;
            data.push(parseFloat((base + noise).toFixed(2)));
            labels.push('');
        }
        data[0] = entry;
        data[steps] = exit;
        const slPrice = t.sl ? entry * (1 - t.sl / 100) : null;
        const datasets = [{
            label: 'Price', data, fill: true, tension: 0.4, pointRadius: 0,
            borderColor: pnlColor, backgroundColor: t.pnl >= 0 ? 'rgba(0,200,83,0.08)' : 'rgba(239,83,80,0.08)', borderWidth: 2
        }];
        if (slPrice) {
            datasets.push({
                label: 'Stop Loss', data: Array(steps + 1).fill(slPrice),
                borderColor: '#ef5350', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false
            });
        }
        new Chart(ctx, {
            type: 'line', data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } } },
                scales: {
                    x: { display: false },
                    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => '₹' + v, font: { size: 10 } } }
                }
            }
        });
    });
}

// ==================== OPEN POSITIONS ====================
function renderOpenPositions() {
    const trades = Store.getTrades().filter(t => t.status === 'Open');
    const search = document.getElementById('positions-search')?.value.toLowerCase() || '';
    const capital = parseFloat(document.getElementById('positions-capital')?.value) || 0;
    const filtered = trades.filter(t => !search || t.symbol.toLowerCase().includes(search));
    const body = document.getElementById('positions-body');
    const noData = document.getElementById('positions-no-data');

    if (filtered.length === 0) {
        body.innerHTML = '';
        noData.style.display = 'block';
        return;
    }
    noData.style.display = 'none';

    body.innerHTML = filtered.map(t => {
        const posSize = capital ? ((t.entryPrice * t.entryQty / capital) * 100).toFixed(2) : 'N/A';
        const daysHeld = Math.floor((new Date() - new Date(t.entryDate)) / 86400000);
        const openRisk = t.sl ? (t.sl).toFixed(2) : 'N/A';
        const unrealizedPnl = 'N/A';
        const rMultiple = 'N/A';
        const portfolioGain = 'N/A';
        return `<tr>
            <td><strong>${t.symbol}</strong></td>
            <td>${posSize}%</td>
            <td>${daysHeld}</td>
            <td>${t.sl || 'N/A'}%</td>
            <td>${openRisk}%</td>
            <td>${unrealizedPnl}</td>
            <td>${rMultiple}</td>
            <td>${portfolioGain}</td>
        </tr>`;
    }).join('');
}

document.getElementById('positions-search')?.addEventListener('input', renderOpenPositions);

// View toggle for open positions
document.getElementById('btn-list-view')?.addEventListener('click', function () {
    this.classList.add('active');
    document.getElementById('btn-chart-view').classList.remove('active');
    document.getElementById('positions-list-view').classList.remove('hidden');
    document.getElementById('positions-chart-view').classList.add('hidden');
});
document.getElementById('btn-chart-view')?.addEventListener('click', function () {
    this.classList.add('active');
    document.getElementById('btn-list-view').classList.remove('active');
    document.getElementById('positions-chart-view').classList.remove('hidden');
    document.getElementById('positions-list-view').classList.add('hidden');
    renderPositionsCharts();
});

// --- Open Positions Charts ---
let posPieChart, posBarChart;

function renderPositionsCharts() {
    if (typeof Chart === 'undefined') return;
    const trades = Store.getTrades().filter(t => t.status === 'Open');
    const capital = parseFloat(document.getElementById('positions-capital')?.value) || 0;
    const noData = document.getElementById('positions-chart-no-data');

    if (trades.length === 0) {
        if (noData) noData.style.display = 'block';
        return;
    }
    if (noData) noData.style.display = 'none';

    const symbols = trades.map(t => t.symbol);
    const invested = trades.map(t => t.entryPrice * t.entryQty);
    const colors = ['#00c853','#448aff','#ff9100','#7c4dff','#ef5350','#26c6da','#ffd600','#ec407a','#66bb6a','#ab47bc'];

    // Pie - Portfolio Allocation
    if (posPieChart) posPieChart.destroy();
    const pieCtx = document.getElementById('positions-chart-pie');
    if (pieCtx) {
        posPieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: symbols,
                datasets: [{
                    data: invested,
                    backgroundColor: symbols.map((_, i) => colors[i % colors.length]),
                    borderWidth: 2, borderColor: '#fff'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '55%',
                plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } } }
            }
        });
    }

    // Bar - Position Sizing
    if (posBarChart) posBarChart.destroy();
    const barCtx = document.getElementById('positions-chart-bar');
    if (barCtx) {
        const daysHeld = trades.map(t => Math.floor((Date.now() - new Date(t.entryDate).getTime()) / 86400000));
        posBarChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: symbols,
                datasets: [
                    {
                        label: 'Invested (₹)',
                        data: invested,
                        backgroundColor: 'rgba(0,200,83,0.6)',
                        borderRadius: 6
                    },
                    {
                        label: 'Days Held',
                        data: daysHeld,
                        backgroundColor: 'rgba(68,138,255,0.6)',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(0,0,0,0.05)' } }
                }
            }
        });
    }
}

// ==================== DASHBOARD ====================
function updateDashboard() {
    const trades = Store.getTrades().filter(t => t.status === 'Closed' || t.exitPrice > 0);
    const total = trades.length;
    const winning = trades.filter(t => t.pnl > 0).length;
    const losing = trades.filter(t => t.pnl < 0).length;
    const unknown = trades.filter(t => t.pnl === 0).length;
    const winRate = total ? ((winning / total) * 100).toFixed(1) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-winning').textContent = winning;
    document.getElementById('stat-losing').textContent = losing;
    document.getElementById('stat-unknown').textContent = unknown;
    document.getElementById('stat-winrate').textContent = winRate + '%';

    const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
    document.getElementById('stat-netpnl').textContent = '₹' + netPnl.toFixed(2);
    document.getElementById('stat-netpnl').className = 'stat-value ' + (netPnl >= 0 ? 'green' : 'red');

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const avgWin = wins.length ? (wins.reduce((s, t) => s + t.pnlPct, 0) / wins.length).toFixed(2) : 0;
    const avgLoss = losses.length ? (losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length).toFixed(2) : 0;
    document.getElementById('stat-avgwin').textContent = avgWin + '%';
    document.getElementById('stat-avgloss').textContent = avgLoss + '%';

    const bigWin = wins.length ? wins.reduce((max, t) => t.pnl > max.pnl ? t : max) : null;
    const bigLoss = losses.length ? losses.reduce((min, t) => t.pnl < min.pnl ? t : min) : null;
    document.getElementById('stat-bigwin').textContent = bigWin ? `₹${bigWin.pnl.toFixed(0)} / ${bigWin.pnlPct.toFixed(1)}%` : '0 / 0%';
    document.getElementById('stat-bigloss').textContent = bigLoss ? `₹${bigLoss.pnl.toFixed(0)} / ${bigLoss.pnlPct.toFixed(1)}%` : '0 / 0%';

    // Render charts
    renderDashboardCharts(trades, winning, losing, unknown);
}

// --- Dashboard Charts ---
let chartEquity, chartWinLoss, chartMonthly;

function renderDashboardCharts(trades, winning, losing, unknown) {
    if (typeof Chart === 'undefined') return;

    // Sort by exit date for equity curve
    const sorted = [...trades].filter(t => t.exitDate).sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate));

    // --- Equity Curve ---
    const equityLabels = [];
    const equityData = [];
    let cumPnl = 0;
    sorted.forEach(t => {
        cumPnl += t.pnl;
        equityLabels.push(t.exitDate);
        equityData.push(parseFloat(cumPnl.toFixed(2)));
    });

    if (chartEquity) chartEquity.destroy();
    const eqCtx = document.getElementById('chart-equity');
    if (eqCtx && equityLabels.length > 0) {
        chartEquity = new Chart(eqCtx, {
            type: 'line',
            data: {
                labels: equityLabels,
                datasets: [{
                    label: 'Cumulative P&L (₹)',
                    data: equityData,
                    borderColor: '#00c853',
                    backgroundColor: 'rgba(0,200,83,0.08)',
                    fill: true, tension: 0.4, pointRadius: 3,
                    pointBackgroundColor: equityData.map(v => v >= 0 ? '#00c853' : '#ef5350')
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 11 } } },
                    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => '₹' + v } }
                }
            }
        });
    }

    // --- Win/Loss Pie ---
    if (chartWinLoss) chartWinLoss.destroy();
    const wlCtx = document.getElementById('chart-winloss');
    if (wlCtx && (winning + losing + unknown) > 0) {
        chartWinLoss = new Chart(wlCtx, {
            type: 'doughnut',
            data: {
                labels: ['Winning', 'Losing', 'Breakeven'],
                datasets: [{
                    data: [winning, losing, unknown],
                    backgroundColor: ['#00c853', '#ef5350', '#90a4ae'],
                    borderWidth: 2, borderColor: '#fff'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '60%',
                plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } }
            }
        });
    }

    // --- Monthly P&L Bar ---
    const monthlyMap = {};
    sorted.forEach(t => {
        const m = t.exitDate.slice(0, 7); // yyyy-mm
        monthlyMap[m] = (monthlyMap[m] || 0) + t.pnl;
    });
    const mLabels = Object.keys(monthlyMap).sort();
    const mData = mLabels.map(m => parseFloat(monthlyMap[m].toFixed(2)));

    if (chartMonthly) chartMonthly.destroy();
    const mCtx = document.getElementById('chart-monthly');
    if (mCtx && mLabels.length > 0) {
        chartMonthly = new Chart(mCtx, {
            type: 'bar',
            data: {
                labels: mLabels.map(m => { const [y, mo] = m.split('-'); const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return mn[parseInt(mo)-1] + ' ' + y.slice(2); }),
                datasets: [{
                    label: 'P&L (₹)',
                    data: mData,
                    backgroundColor: mData.map(v => v >= 0 ? 'rgba(0,200,83,0.7)' : 'rgba(239,83,80,0.7)'),
                    borderRadius: 6, borderSkipped: false
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => '₹' + v } }
                }
            }
        });
    }
}

// ==================== TRADE DIARY ====================
function renderTradeDiary() {
    const trades = Store.getTrades();
    const search = document.getElementById('diary-search')?.value.toLowerCase() || '';
    const sortVal = document.getElementById('diary-sort')?.value || '';
    let filtered = trades.filter(t => !search || t.symbol.toLowerCase().includes(search));

    if (sortVal.includes('Newest')) filtered.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
    else if (sortVal.includes('Oldest')) filtered.sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
    else if (sortVal.includes('High')) filtered.sort((a, b) => b.pnl - a.pnl);
    else if (sortVal.includes('Low')) filtered.sort((a, b) => a.pnl - b.pnl);

    const list = document.getElementById('diary-trades-list');
    const noData = document.getElementById('diary-no-data');

    if (filtered.length === 0) {
        list.innerHTML = '';
        noData.style.display = 'block';
        return;
    }
    noData.style.display = 'none';

    list.innerHTML = filtered.map(t => {
        const pnlClass = t.pnl >= 0 ? 'positive' : 'negative';
        return `<div class="diary-card" onclick="viewTrade(${t.id})" style="cursor:pointer" title="Click to view details">
            <div class="diary-card-info">
                <h4>${t.symbol} <span style="font-weight:400;font-size:.8rem;color:var(--text-light)">${t.type || 'Buy'}</span></h4>
                <p>Entry: ₹${t.entryPrice.toFixed(2)} × ${t.entryQty} | ${t.entryDate}</p>
                <p>${t.exitPrice ? `Exit: ₹${t.exitPrice.toFixed(2)} × ${t.exitQty || t.entryQty} | ${t.exitDate}` : '<span style="color:var(--primary)">● Open Position</span>'}</p>
                ${t.notes ? `<p style="margin-top:6px;font-style:italic;color:#888">"${t.notes}"</p>` : ''}
            </div>
            <div class="diary-card-pnl ${pnlClass}">
                <span>${t.pnl >= 0 ? '+' : ''}₹${t.pnl.toFixed(2)}</span>
                <span style="font-size:.8rem">${t.pnlPct.toFixed(2)}%</span>
                <span style="font-size:.7rem;color:#448aff;margin-top:4px"><i class="fas fa-eye"></i> View</span>
            </div>
        </div>`;
    }).join('');
}

document.getElementById('diary-search')?.addEventListener('input', renderTradeDiary);
document.getElementById('diary-sort')?.addEventListener('change', renderTradeDiary);

// Diary view toggle
document.getElementById('btn-diary-trades')?.addEventListener('click', function () {
    this.classList.add('active');
    document.getElementById('btn-diary-summary').classList.remove('active');
    document.getElementById('diary-trades-view').classList.remove('hidden');
    document.getElementById('diary-summary-view').classList.add('hidden');
});
document.getElementById('btn-diary-summary')?.addEventListener('click', function () {
    this.classList.add('active');
    document.getElementById('btn-diary-trades').classList.remove('active');
    document.getElementById('diary-summary-view').classList.remove('hidden');
    document.getElementById('diary-trades-view').classList.add('hidden');
    renderDiarySummary();
});

function renderDiarySummary() {
    const trades = Store.getTrades();
    const container = document.getElementById('diary-summary-cards');
    const closed = trades.filter(t => t.exitPrice > 0);
    const totalPnl = closed.reduce((s, t) => s + t.pnl, 0);
    const wins = closed.filter(t => t.pnl > 0).length;
    const winRate = closed.length ? ((wins / closed.length) * 100).toFixed(1) : 0;

    container.innerHTML = `
        <div class="dashboard-grid">
            <div class="dash-card">
                <h2>Summary</h2>
                <div class="stat-grid">
                    <div class="stat-item"><span class="stat-label">Total Trades</span><span class="stat-value">${trades.length}</span></div>
                    <div class="stat-item"><span class="stat-label">Closed Trades</span><span class="stat-value">${closed.length}</span></div>
                    <div class="stat-item"><span class="stat-label">Open Trades</span><span class="stat-value">${trades.filter(t => t.status === 'Open').length}</span></div>
                    <div class="stat-item"><span class="stat-label">Net P&L</span><span class="stat-value ${totalPnl >= 0 ? 'green' : 'red'}">₹${totalPnl.toFixed(2)}</span></div>
                    <div class="stat-item"><span class="stat-label">Win Rate</span><span class="stat-value">${winRate}%</span></div>
                </div>
            </div>
        </div>`;
}

// ==================== EDIT / DELETE TRADE ====================
function editTrade(id) {
    const trades = Store.getTrades();
    const trade = trades.find(t => t.id === id);
    if (!trade) return;

    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = `Edit Trade - ${trade.symbol}`;

    body.innerHTML = `
        <div class="form-row">
            <div class="form-group"><label>Symbol</label><input type="text" id="edit-symbol" value="${trade.symbol}"></div>
            <div class="form-group"><label>Type</label><select id="edit-type"><option ${trade.type === 'Buy' ? 'selected' : ''}>Buy</option><option ${trade.type === 'Sell' ? 'selected' : ''}>Sell</option></select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Entry Price</label><input type="number" id="edit-entry-price" value="${trade.entryPrice}"></div>
            <div class="form-group"><label>Entry Qty</label><input type="number" id="edit-entry-qty" value="${trade.entryQty}"></div>
            <div class="form-group"><label>Entry Date</label><input type="date" id="edit-entry-date" value="${trade.entryDate}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Exit Price</label><input type="number" id="edit-exit-price" value="${trade.exitPrice || ''}"></div>
            <div class="form-group"><label>Exit Qty</label><input type="number" id="edit-exit-qty" value="${trade.exitQty || ''}"></div>
            <div class="form-group"><label>Exit Date</label><input type="date" id="edit-exit-date" value="${trade.exitDate || ''}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>SL (%)</label><input type="number" id="edit-sl" value="${trade.sl || ''}"></div>
            <div class="form-group"><label>Status</label><select id="edit-status"><option ${trade.status === 'Closed' ? 'selected' : ''}>Closed</option><option ${trade.status === 'Open' ? 'selected' : ''}>Open</option></select></div>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="edit-notes">${trade.notes || ''}</textarea></div>
        <div class="form-actions">
            <button class="btn btn-success" id="btn-save-edit"><i class="fas fa-save"></i> Save Changes</button>
            <button class="btn btn-outline" id="btn-cancel-edit"><i class="fas fa-times"></i> Cancel</button>
        </div>`;

    modal.classList.remove('hidden');

    document.getElementById('btn-save-edit').addEventListener('click', () => {
        const ep = parseFloat(document.getElementById('edit-entry-price').value);
        const xp = parseFloat(document.getElementById('edit-exit-price').value) || 0;
        const eq = parseInt(document.getElementById('edit-entry-qty').value);

        trade.symbol = document.getElementById('edit-symbol').value.trim().toUpperCase();
        trade.type = document.getElementById('edit-type').value;
        trade.entryPrice = ep;
        trade.entryQty = eq;
        trade.entryDate = document.getElementById('edit-entry-date').value;
        trade.exitPrice = xp;
        trade.exitQty = parseInt(document.getElementById('edit-exit-qty').value) || eq;
        trade.exitDate = document.getElementById('edit-exit-date').value;
        trade.sl = parseFloat(document.getElementById('edit-sl').value) || 5;
        trade.status = document.getElementById('edit-status').value;
        trade.notes = document.getElementById('edit-notes').value;
        trade.pnl = xp ? ((xp - ep) * eq) : 0;
        trade.pnlPct = xp ? (((xp - ep) / ep) * 100) : 0;

        Store.setTrades(trades);
        modal.classList.add('hidden');
        renderManageTrades();
        showToast('Trade updated!');
    });

    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}

function deleteTrade(id) {
    if (!confirm('Are you sure you want to delete this trade?')) return;
    const trades = Store.getTrades().filter(t => t.id !== id);
    Store.setTrades(trades);
    renderManageTrades();
    renderOpenPositions();
    showToast('Trade deleted', 'info');
}

// Modal close
document.getElementById('modal-close')?.addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
});
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});

// ==================== INIT ====================
function startApp() {
    // Clear old rendered content to prevent data leaks between users
    const clearEls = ['manage-trades-body', 'positions-body', 'diary-trades-list'];
    clearEls.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
    // Re-render everything for current user
    renderRuleBook();
    renderManageTrades();
    renderOpenPositions();
    updateDashboard();
    navigateTo('rulebook');
}
// Start with auth check
initAuth();

// ==================== POSITION MANAGER ====================
// Store helpers
function getPMPositions() { return Store.get('positions', []); }
function setPMPositions(p) { Store.set('positions', p); }
function getPMCapital() { return Store.get('pm_capital', 0); }
function setPMCapital(c) { Store.set('pm_capital', c); }

let pmActiveFilter = 'active';

function generateChartData(seed, points = 40) {
    let val = seed || 100;
    const data = [val];
    for (let i = 1; i < points; i++) {
        val += (Math.random() - 0.45) * (val * 0.03);
        val = Math.max(val * 0.5, val);
        data.push(val);
    }
    return data;
}

function drawMiniChart(canvas, data, isPositive) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const step = w / (data.length - 1);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (isPositive) {
        grad.addColorStop(0, 'rgba(0,200,83,0.18)');
        grad.addColorStop(1, 'rgba(0,200,83,0)');
    } else {
        grad.addColorStop(0, 'rgba(239,83,80,0.18)');
        grad.addColorStop(1, 'rgba(239,83,80,0)');
    }

    ctx.beginPath();
    ctx.moveTo(0, h - ((data[0] - min) / range) * (h - 10) - 5);
    for (let i = 1; i < data.length; i++) {
        const x = i * step;
        const y = h - ((data[i] - min) / range) * (h - 10) - 5;
        const px = (i - 1) * step;
        const py = h - ((data[i - 1] - min) / range) * (h - 10) - 5;
        const cx = (px + x) / 2;
        ctx.bezierCurveTo(cx, py, cx, y, x, y);
    }
    // Fill
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(0, h - ((data[0] - min) / range) * (h - 10) - 5);
    for (let i = 1; i < data.length; i++) {
        const x = i * step;
        const y = h - ((data[i] - min) / range) * (h - 10) - 5;
        const px = (i - 1) * step;
        const py = h - ((data[i - 1] - min) / range) * (h - 10) - 5;
        const cx = (px + x) / 2;
        ctx.bezierCurveTo(cx, py, cx, y, x, y);
    }
    ctx.strokeStyle = isPositive ? '#00c853' : '#ef5350';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Capital set button
document.getElementById('btn-pm-set-capital')?.addEventListener('click', () => {
    const val = parseFloat(document.getElementById('pm-capital-input')?.value) || 0;
    if (val <= 0) { showToast('Please enter a valid capital amount', 'error'); return; }
    setPMCapital(val);
    renderPositionManager();
    showToast(`Capital set to ₹${val.toLocaleString('en-IN')}!`);
});

function renderPositionManager() {
    const positions = getPMPositions();
    const capital = getPMCapital();
    // Populate capital input
    const capInput = document.getElementById('pm-capital-input');
    if (capInput && capital > 0 && !capInput.value) capInput.value = capital;
    const grid = document.getElementById('pm-cards-grid');
    const noData = document.getElementById('pm-no-data');

    // Filter
    let filtered = positions;
    if (pmActiveFilter === 'active') filtered = positions.filter(p => p.status === 'Active');
    else if (pmActiveFilter === 'closed') filtered = positions.filter(p => p.status === 'Closed');
    else if (pmActiveFilter === 'sl') filtered = positions.filter(p => p.hitSL);
    else if (pmActiveFilter === 'tp') filtered = positions.filter(p => p.hitTP);

    // Summary
    const activePos = positions.filter(p => p.status === 'Active');
    const totalInvested = activePos.reduce((s, p) => s + (p.entryPrice * p.qty), 0);
    const investedPct = capital ? ((totalInvested / capital) * 100).toFixed(1) : 0;
    const totalPnl = positions.reduce((s, p) => s + (p.currentPnl || 0), 0);
    const totalPnlPct = capital ? ((totalPnl / capital) * 100).toFixed(1) : 0;
    const dayPnl = positions.reduce((s, p) => s + (p.dayChange || 0), 0);
    const cashLeft = capital - totalInvested;

    document.getElementById('pm-invested').textContent = investedPct + '%';
    document.getElementById('pm-invested-sub').textContent = `₹${(totalInvested/100000).toFixed(2)}L of ₹${(capital/100000).toFixed(2)}L`;
    const dayEl = document.getElementById('pm-day-pnl');
    dayEl.textContent = `${dayPnl >= 0 ? '+' : ''}₹${(dayPnl/100000).toFixed(2)}L`;
    dayEl.className = 'pm-summary-value ' + (dayPnl >= 0 ? 'green' : 'red');
    const totEl = document.getElementById('pm-total-pnl');
    totEl.textContent = `+₹${(totalPnl/100000).toFixed(2)}L`;
    totEl.className = 'pm-summary-value ' + (totalPnl >= 0 ? 'green' : 'red');
    const pctEl = document.getElementById('pm-total-pnl-pct');
    pctEl.textContent = totalPnlPct + '%';
    pctEl.className = 'pm-summary-value ' + (totalPnl >= 0 ? 'green' : 'red');
    document.getElementById('pm-cash').textContent = `+₹${(cashLeft/100000).toFixed(2)}L`;

    if (filtered.length === 0) {
        grid.innerHTML = '';
        noData.classList.remove('hidden');
        return;
    }
    noData.classList.add('hidden');

    grid.innerHTML = filtered.map((p, idx) => {
        const pnlPct = p.entryPrice ? (((p.currentPrice || p.entryPrice) - p.entryPrice) / p.entryPrice * 100) : 0;
        const isPos = pnlPct >= 0;
        const tf = p.timeframe || 'DAILY';
        const badgeClass = tf === 'WEEKLY' ? 'weekly' : tf === 'SWING' ? 'swing' : 'daily';
        const pnlVal = ((p.currentPrice || p.entryPrice) - p.entryPrice) * p.qty;
        return `<div class="pm-card" data-idx="${idx}">
            <div class="pm-card-actions">
                <button class="pm-card-action-btn" onclick="editPMPosition(${p.id})" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="pm-card-action-btn danger" onclick="deletePMPosition(${p.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
            <div class="pm-card-header">
                <div class="pm-card-symbol">${p.symbol} <span class="pm-card-badge ${badgeClass}">${tf}</span></div>
                <div class="pm-card-pnl-badge ${isPos ? 'positive' : 'negative'}">${isPos ? '+' : ''}${pnlPct.toFixed(1)}%</div>
            </div>
            <div class="pm-card-details">
                <div class="pm-card-detail"><span class="pm-card-detail-label">Position size</span><span class="pm-card-detail-value">${p.qty}</span></div>
                <div class="pm-card-detail"><span class="pm-card-detail-label">Entry</span><span class="pm-card-detail-value">₹${p.entryPrice.toFixed(2)}</span></div>
                <div class="pm-card-detail"><span class="pm-card-detail-label">Holding</span><span class="pm-card-detail-value">${Math.floor((Date.now() - new Date(p.entryDate).getTime()) / 86400000)}d</span></div>
            </div>
            <div class="pm-card-chart"><canvas id="pm-chart-${p.id}"></canvas></div>
            <div class="pm-card-footer">
                <div class="pm-card-footer-left">CMP <span class="pm-card-footer-val">₹${(p.currentPrice || p.entryPrice).toFixed(2)}</span></div>
                <div class="pm-card-footer-val ${isPos ? 'green' : 'red'}">${isPos ? '+' : ''}₹${(pnlVal/1000).toFixed(1)}K</div>
            </div>
        </div>`;
    }).join('');

    // Draw charts after DOM update
    requestAnimationFrame(() => {
        filtered.forEach(p => {
            const canvas = document.getElementById(`pm-chart-${p.id}`);
            const pnlPct = p.entryPrice ? (((p.currentPrice || p.entryPrice) - p.entryPrice) / p.entryPrice * 100) : 0;
            const chartData = p._chartCache || generateChartData(p.entryPrice);
            if (!p._chartCache) p._chartCache = chartData;
            drawMiniChart(canvas, chartData, pnlPct >= 0);
        });
    });
}

// PM Tab clicks
document.querySelectorAll('.pm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        pmActiveFilter = tab.dataset.filter;
        renderPositionManager();
    });
});

document.getElementById('pm-refresh-btn')?.addEventListener('click', () => {
    const positions = getPMPositions();
    positions.forEach(p => {
        delete p._chartCache;
        // Simulate price movement
        const change = (Math.random() - 0.4) * p.entryPrice * 0.02;
        p.currentPrice = (p.currentPrice || p.entryPrice) + change;
        p.dayChange = change * p.qty;
        p.currentPnl = (p.currentPrice - p.entryPrice) * p.qty;
    });
    setPMPositions(positions);
    renderPositionManager();
    showToast('Positions refreshed!', 'info');
});

document.getElementById('btn-pm-add')?.addEventListener('click', () => showPMModal());

function showPMModal(pos = null) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = pos ? `Edit - ${pos.symbol}` : 'Add Position';

    body.innerHTML = `
        <div class="form-row">
            <div class="form-group"><label>Symbol</label><input type="text" id="pm-symbol" value="${pos ? pos.symbol : ''}" placeholder="e.g. RELIANCE"></div>
            <div class="form-group"><label>Timeframe</label><select id="pm-timeframe">
                <option ${pos?.timeframe === 'DAILY' ? 'selected' : ''}>DAILY</option>
                <option ${pos?.timeframe === 'WEEKLY' ? 'selected' : ''}>WEEKLY</option>
                <option ${pos?.timeframe === 'SWING' ? 'selected' : ''}>SWING</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Entry Price</label><input type="number" id="pm-entry" value="${pos ? pos.entryPrice : ''}" placeholder="0.00"></div>
            <div class="form-group"><label>Quantity</label><input type="number" id="pm-qty" value="${pos ? pos.qty : ''}" placeholder="0"></div>
            <div class="form-group"><label>Entry Date</label><input type="date" id="pm-date" value="${pos ? pos.entryDate : new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Current Price</label><input type="number" id="pm-current" value="${pos ? (pos.currentPrice || '') : ''}" placeholder="Live price"></div>
            <div class="form-group"><label>Status</label><select id="pm-status">
                <option ${pos?.status === 'Active' ? 'selected' : ''}>Active</option>
                <option ${pos?.status === 'Closed' ? 'selected' : ''}>Closed</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>SL Price</label><input type="number" id="pm-sl" value="${pos ? (pos.slPrice || '') : ''}" placeholder="Stop loss"></div>
            <div class="form-group"><label>Target Price</label><input type="number" id="pm-tp" value="${pos ? (pos.tpPrice || '') : ''}" placeholder="Target"></div>
        </div>
        <div class="form-actions">
            <button class="btn btn-success" id="btn-pm-save"><i class="fas fa-save"></i> ${pos ? 'Update' : 'Add Position'}</button>
            <button class="btn btn-outline" id="btn-pm-cancel"><i class="fas fa-times"></i> Cancel</button>
        </div>`;

    modal.classList.remove('hidden');

    document.getElementById('btn-pm-save').addEventListener('click', () => {
        const sym = document.getElementById('pm-symbol').value.trim().toUpperCase();
        const entry = parseFloat(document.getElementById('pm-entry').value);
        const qty = parseInt(document.getElementById('pm-qty').value);
        if (!sym || !entry || !qty) { showToast('Fill symbol, price & qty', 'error'); return; }

        const curr = parseFloat(document.getElementById('pm-current').value) || entry;
        const posData = {
            id: pos ? pos.id : Date.now(),
            symbol: sym,
            timeframe: document.getElementById('pm-timeframe').value,
            entryPrice: entry, qty,
            entryDate: document.getElementById('pm-date').value,
            currentPrice: curr,
            slPrice: parseFloat(document.getElementById('pm-sl').value) || 0,
            tpPrice: parseFloat(document.getElementById('pm-tp').value) || 0,
            status: document.getElementById('pm-status').value,
            currentPnl: (curr - entry) * qty,
            dayChange: 0,
            hitSL: false, hitTP: false
        };

        const positions = getPMPositions();
        if (pos) {
            const idx = positions.findIndex(p => p.id === pos.id);
            if (idx >= 0) positions[idx] = posData;
        } else {
            positions.unshift(posData);
        }
        setPMPositions(positions);
        modal.classList.add('hidden');
        renderPositionManager();
        showToast(pos ? 'Position updated!' : `${sym} position added!`);
    });

    document.getElementById('btn-pm-cancel').addEventListener('click', () => modal.classList.add('hidden'));
}

function editPMPosition(id) {
    const pos = getPMPositions().find(p => p.id === id);
    if (pos) showPMModal(pos);
}

function deletePMPosition(id) {
    if (!confirm('Delete this position?')) return;
    setPMPositions(getPMPositions().filter(p => p.id !== id));
    renderPositionManager();
    showToast('Position deleted', 'info');
}

// Data State
let transactions = JSON.parse(localStorage.getItem('bluelove_v3_ledger')) || [];
let inventory = JSON.parse(localStorage.getItem('bluelove_v3_inventory')) || [];
let currentView = 'finances';
let chartInstance = null;

// REPLACE THIS WITH YOUR CLIENT ID FROM GOOGLE CLOUD CONSOLE
const GOOGLE_CLIENT_ID = "170054180178-nh27grpjrdgqdvuvr3ihlbv1ihv45i3t.apps.googleusercontent.com";

window.onload = () => {
    initAuth();
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
    document.getElementById('f-date').valueAsDate = new Date();
    renderDashboard();
};

function initAuth() {
    const user = JSON.parse(localStorage.getItem('bluelove_v3_user'));
    if (user) {
        showApp();
    } else {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleAuthResponse
        });
        google.accounts.id.renderButton(
            document.getElementById("google-btn"),
            { theme: "outline", size: "large", shape: "pill", width: 280 }
        );
    }
}

const ALLOWED_EMAIL = "bluelove.bracelets.96@gmail.com";

function handleAuthResponse(response) {
    const payload = decodeJwt(response.credential);
    
    if (payload.email !== ALLOWED_EMAIL) {
        alert("Access Denied: This dashboard is reserved for Bluelove Studio members.");
        return;
    }

    const user = {
        name: payload.name,
        email: payload.email,
        picture: payload.picture
    };
    localStorage.setItem('bluelove_v3_user', JSON.stringify(user));
    showApp();
}

function decodeJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
}

function showApp() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    const user = JSON.parse(localStorage.getItem('bluelove_v3_user'));
    if (user) {
        document.getElementById('currentDate').parentElement.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="text-right">
                    <p class="text-blue-900 font-bold text-sm">${user.name}</p>
                    <p class="text-pink-400 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:text-red-500" onclick="logout()">Logout</p>
                </div>
                <img src="${user.picture}" class="w-10 h-10 rounded-full border-2 border-pink-100 shadow-sm">
            </div>
        `;
    }
}

function logout() {
    localStorage.removeItem('bluelove_v3_user');
    window.location.reload();
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-container').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${view}`).classList.add('active');
    
    document.getElementById('btnText').innerText = view === 'finances' ? 'New Entry' : 'Add Material';
    renderDashboard();
}

function toggleModal() {
    const modalId = currentView === 'finances' ? 'modal-finances' : 'modal-inventory';
    document.getElementById(modalId).classList.toggle('hidden');
}

// Finance Handlers
document.getElementById('financeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = {
        id: Date.now(),
        description: document.getElementById('f-desc').value,
        type: document.getElementById('f-type').value,
        amount: parseFloat(document.getElementById('f-amount').value),
        category: document.getElementById('f-category').value,
        date: document.getElementById('f-date').value
    };
    transactions.unshift(entry);
    saveData('ledger', transactions);
    renderDashboard();
    toggleModal();
    e.target.reset();
    document.getElementById('f-date').valueAsDate = new Date();
});

// Inventory Handlers
document.getElementById('inventoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const item = {
        id: Date.now(),
        name: document.getElementById('m-name').value,
        color: document.getElementById('m-color').value, 
        type: document.getElementById('m-type').value,
        quantity: parseInt(document.getElementById('m-quantity').value)
    };
    inventory.unshift(item);
    saveData('inventory', inventory);
    renderDashboard();
    toggleModal();
    e.target.reset();
    document.getElementById('m-color').value = "#1e40af";
});

function deleteItem(id, type) {
    if (type === 'finance') {
        transactions = transactions.filter(t => t.id !== id);
        saveData('ledger', transactions);
    } else {
        inventory = inventory.filter(m => m.id !== id);
        saveData('inventory', inventory);
    }
    renderDashboard();
}

function updateQuantity(id, change) {
    const item = inventory.find(m => m.id === id);
    if (item) {
        item.quantity = Math.max(0, item.quantity + change);
        saveData('inventory', inventory);
        renderDashboard();
    }
}

function saveData(key, data) {
    localStorage.setItem(`bluelove_v3_${key}`, JSON.stringify(data));
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function renderDashboard() {
    if (currentView === 'finances') renderFinances();
    else renderInventory();
}

function renderFinances() {
    let inc = 0, exp = 0;
    transactions.forEach(t => { t.type === 'income' ? inc += t.amount : exp += t.amount; });

    document.getElementById('totalIncome').innerText = formatCurrency(inc);
    document.getElementById('totalSpent').innerText = formatCurrency(exp);
    document.getElementById('totalSaved').innerText = formatCurrency(inc - exp);
    document.getElementById('totalSaved').className = `text-3xl font-extrabold ${inc - exp < 0 ? 'text-red-500' : 'text-blue-600'}`;

    const filter = document.getElementById('filterType').value;
    const body = document.getElementById('transactionBody');
    const filtered = transactions.filter(t => filter === 'all' || t.type === filter);
    
    body.innerHTML = '';
    document.getElementById('financeEmpty').classList.toggle('hidden', filtered.length > 0);
    
    filtered.forEach(t => {
        const row = document.createElement('tr');
        row.className = "group transition-all hover:bg-white/40";
        row.innerHTML = `
            <td class="px-8 py-5">
                <div class="text-sm font-bold text-gray-800">${new Date(t.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}</div>
                <div class="text-[10px] uppercase tracking-wider text-blue-400 font-bold">${t.category}</div>
            </td>
            <td class="px-8 py-5 font-semibold text-gray-700">${t.description}</td>
            <td class="px-8 py-5 text-right font-black ${t.type === 'income' ? 'text-green-500' : 'text-red-400'}">
                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount).replace('₹','')}
            </td>
            <td class="px-8 py-5 text-right">
                <button onclick="deleteItem(${t.id}, 'finance')" class="p-2 rounded-xl text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        body.appendChild(row);
    });
    updateFinanceChart(inc, exp);
}

function renderInventory() {
    const search = document.getElementById('inventorySearch').value.toLowerCase();
    const body = document.getElementById('inventoryBody');
    const filtered = inventory.filter(m => m.name.toLowerCase().includes(search) || m.color.toLowerCase().includes(search));
    
    let lowStock = 0, totalUnits = 0;
    inventory.forEach(m => {
        totalUnits += m.quantity;
        if (m.quantity < 5) lowStock++;
    });

    document.getElementById('totalMaterials').innerText = inventory.length;
    document.getElementById('lowStockCount').innerText = lowStock;
    document.getElementById('totalUnits').innerText = totalUnits;

    body.innerHTML = '';
    document.getElementById('inventoryEmpty').classList.toggle('hidden', filtered.length > 0);

    filtered.forEach(m => {
        const row = document.createElement('tr');
        row.className = "group transition-all hover:bg-white/40";
        row.innerHTML = `
            <td class="px-8 py-5">
                <div class="text-sm font-bold text-gray-800">${m.name}</div>
                <div class="text-[10px] uppercase tracking-wider text-blue-400 font-bold">HEX: ${m.color.toUpperCase()}</div>
            </td>
            <td class="px-8 py-5 font-semibold text-gray-600">${m.type}</td>
            <td class="px-8 py-5">
                <div class="flex items-center gap-2">
                    <div class="w-5 h-5 rounded-lg border border-white shadow-sm" style="background-color: ${m.color}"></div>
                    <span class="text-sm font-medium text-gray-600 tracking-tighter">${m.color.toUpperCase()}</span>
                </div>
            </td>
            <td class="px-8 py-5 text-right">
                <div class="flex items-center justify-end gap-3">
                    <button onclick="updateQuantity(${m.id}, -1)" class="w-6 h-6 rounded-lg bg-red-100 text-red-500 flex items-center justify-center font-bold">-</button>
                    <span class="font-black text-lg ${m.quantity < 5 ? 'text-amber-600' : 'text-gray-800'}">${m.quantity}</span>
                    <button onclick="updateQuantity(${m.id}, 1)" class="w-6 h-6 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-bold">+</button>
                </div>
            </td>
            <td class="px-8 py-5 text-right">
                <button onclick="deleteItem(${m.id}, 'inventory')" class="p-2 rounded-xl text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        body.appendChild(row);
    });
}

function updateFinanceChart(inc, exp) {
    const canvas = document.getElementById('financeChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Revenue', 'Expenses'],
            datasets: [{
                data: [inc || 1, exp || 0],
                backgroundColor: ['#2563eb', '#f87171'],
                borderRadius: 10,
                spacing: 5
            }]
        },
        options: { cutout: '80%', plugins: { legend: { display: false } } }
    });
}

// --- GLOBAL STATE & VARIABLES ---
let allProducts = []; 
let selectedProducts = [null, null];
let activeSlotIndex = null;
let userRegion = 'US';
let userLanguage = 'en';
let currentFilter = 'all';
let comparisonChart = null, scatterPlotChart = null;

// --- DOM ELEMENTS ---
const D = document;
const comparisonGrid = D.getElementById('comparison-grid');
const addProductModal = D.getElementById('add-product-modal');
const closeAddModalButton = D.getElementById('close-add-modal');
const productList = D.getElementById('product-list');
const searchBar = D.getElementById('search-bar');
const menuToggleButton = D.getElementById('menu-toggle-button');
const settingsMenu = D.getElementById('settings-menu');
const countrySelector = D.getElementById('country-selector');
const welcomeCountrySelector = D.getElementById('welcome-country-selector');
const languageSelector = D.getElementById('language-selector');
const themeSelector = D.getElementById('theme-selector');
const chartCategorySelector = D.getElementById('chart-category-selector');
const barChartCanvas = D.getElementById('comparisonChart').getContext('2d');
const scatterPlotCanvas = D.getElementById('scatterPlotChart').getContext('2d');
const filterContainer = D.querySelector('.filter-container');
const welcomeModal = D.getElementById('welcome-modal');
const saveRegionButton = D.getElementById('save-region-button');
const fullDataTableBody = D.querySelector('#full-data-table tbody');
const fullDataTableHead = D.querySelector('#full-data-table thead');
const tableSearchInput = D.getElementById('table-search');
const directComparisonContainer = D.getElementById('direct-comparison-table-container');
const directComparisonTable = D.getElementById('direct-comparison-table');
const tabsContainer = D.querySelector('.tabs');
const tabContents = D.querySelectorAll('.tab-content');
const quickViewModal = D.getElementById('quick-view-modal');
const quickViewContent = D.getElementById('quick-view-content');

// --- TRANSLATION DICTIONARY ---
const translations = { /* ... as before ... */ };

// --- INITIALIZATION ---
async function initializeApp() {
    loadParticleBackground();
    setupEventListeners();
    applyTheme(localStorage.getItem('theme') || 'system');
    await checkAndSetRegion();
    try {
        const response = await fetch('./earbuds.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allProducts = await response.json();
        renderAll();
    } catch (error) { console.error("Could not initialize app:", error); }
}

function renderAll() {
    renderGridAndComparisonTable();
    updateLanguage();
    renderOrUpdateChart();
    renderScatterPlot();
    renderDataTable();
}

// --- NEW QUICK VIEW MODAL LOGIC ---
function openQuickViewModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    quickViewContent.innerHTML = `
        <button id="close-quick-view" class="close-button">&times;</button>
        <div class="product-header">
            <img src="${product.image}" alt="${product.name}">
            <h2>${product.name}</h2>
        </div>
        <ul class="spec-list">${Object.entries(product.specs).map(([key, value]) => `<li><span class="spec-label">${key}</span> <span>${value}</span></li>`).join('')}</ul>
        <div class="price-list">${createPriceListHTML(product)}</div>
        <button class="add-to-compare-btn" data-product-id="${product.id}">+ Add to Compare</button>
    `;
    
    quickViewModal.classList.add('active');
    D.getElementById('close-quick-view').addEventListener('click', closeQuickViewModal);
    D.querySelector('.add-to-compare-btn').addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.productId);
        // Find first empty slot to add the product
        const emptySlotIndex = selectedProducts.findIndex(p => p === null);
        if (emptySlotIndex !== -1) {
            selectProduct(id, emptySlotIndex);
        } else {
            selectProduct(id, selectedProducts.length); // Add to the end
        }
        closeQuickViewModal();
    });
}

function closeQuickViewModal() {
    quickViewModal.classList.remove('active');
}

// --- EVENT LISTENERS (Updated) ---
function setupEventListeners() {
    // ... existing listeners ...
    closeAddModalButton.addEventListener('click', closeModal);
    quickViewModal.addEventListener('click', (e) => { if(e.target === quickViewModal) closeQuickViewModal(); });
    fullDataTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row && row.dataset.productId) {
            openQuickViewModal(parseInt(row.dataset.productId));
        }
    });
    // ... all other listeners from previous version ...
    saveRegionButton.addEventListener('click', () => { userRegion = welcomeCountrySelector.value; localStorage.setItem('userRegion', userRegion); countrySelector.value = userRegion; welcomeModal.classList.remove('active'); renderGridAndComparisonTable(); });
    menuToggleButton.addEventListener('click', () => settingsMenu.classList.toggle('open'));
    countrySelector.addEventListener('change', (e) => { userRegion = e.target.value; localStorage.setItem('userRegion', userRegion); renderAll(); });
    languageSelector.addEventListener('change', (e) => { userLanguage = e.target.value; updateLanguage(); });
    themeSelector.addEventListener('change', (e) => applyTheme(e.target.value));
    chartCategorySelector.addEventListener('change', renderOrUpdateChart);
    filterContainer.addEventListener('change', (e) => { if (e.target.name === 'product-type') { currentFilter = e.target.value; selectedProducts = selectedProducts.map(p => (p && (currentFilter === 'all' || p.type === currentFilter)) ? p : null); renderAll(); } });
    tabsContainer.addEventListener('click', (e) => { if (e.target.matches('.tab-link:not(.active)')) { tabsContainer.querySelector('.active').classList.remove('active'); tabContents.forEach(content => content.classList.remove('active')); e.target.classList.add('active'); const targetTab = D.getElementById(e.target.dataset.tab); targetTab.classList.add('active'); if(e.target.dataset.tab === 'tab-market-chart') renderOrUpdateChart(); if(e.target.dataset.tab === 'tab-value-plot') renderScatterPlot(); } });
    tableSearchInput.addEventListener('input', (e) => renderDataTable(e.target.value));
    addProductModal.addEventListener('click', (e) => { if (e.target === addProductModal) closeModal(); });
    searchBar.addEventListener('input', (e) => populateModalList(e.target.value));
}

// --- DYNAMIC COMPARISON (Updated) ---
function selectProduct(productId, slotIndex) {
    const product = allProducts.find(p => p.id === parseInt(productId));
    if (slotIndex >= selectedProducts.length) {
        selectedProducts.push(product);
    } else {
        selectedProducts[slotIndex] = product;
    }
    closeModal();
    renderGridAndComparisonTable();
}

function openModal(index) {
    activeSlotIndex = index;
    populateModalList();
    addProductModal.classList.add('active');
}
function closeModal() {
    addProductModal.classList.remove('active');
}

// --- CHART LOGIC (Updated to use Quick View) ---
function renderOrUpdateChart() {
    let dataToDisplay = getFilteredData();
    if (!dataToDisplay.length) { if (comparisonChart) comparisonChart.destroy(); return; }

    const category = chartCategorySelector.value;
    const isPrice = category === 'price';
    
    dataToDisplay.sort((a, b) => isPrice ? a.scores[category] - b.scores[category] : b.scores[category] - a.scores[category]);

    if (comparisonChart) comparisonChart.destroy();
    
    document.querySelector("#comparisonChart").parentElement.style.height = `${dataToDisplay.length * 28}px`;

    comparisonChart = new Chart(barChartCanvas, {
        type: 'bar',
        data: { labels: dataToDisplay.map(p => p.name), datasets: [{ label: chartCategorySelector.options[chartCategorySelector.selectedIndex].text, data: dataToDisplay.map(p => p.scores[category]), backgroundColor: 'rgba(0, 123, 255, 0.6)', borderColor: 'rgba(0, 123, 255, 1)', borderWidth: 1 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            onClick: (e) => { // CHANGED
                const points = comparisonChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const product = dataToDisplay[points[0].index];
                    openQuickViewModal(product.id); // Open Quick View instead of link
                }
            },
            onHover: (e, el) => e.native.target.style.cursor = el[0] ? 'pointer' : 'default',
            plugins: { legend: { display: false }, tooltip: { /* ... as before ... */ } },
            scales: { /* ... as before ... */ }
        }
    });
}

function renderScatterPlot() {
    let dataToDisplay = getFilteredData();
    if (!dataToDisplay.length) { if (scatterPlotChart) scatterPlotChart.destroy(); return; }

    const plotData = dataToDisplay.map(p => ({ x: p.scores.price, y: p.scores.sound_score, label: p.name, id: p.id }));

    if (scatterPlotChart) scatterPlotChart.destroy();

    scatterPlotChart = new Chart(scatterPlotCanvas, {
        type: 'scatter',
        data: { datasets: [{ label: 'Price vs. Sound', data: plotData, backgroundColor: 'rgba(0, 123, 255, 0.7)' }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            onClick: (e) => { // CHANGED
                const points = scatterPlotChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const product = plotData[points[0].index];
                    openQuickViewModal(product.id);
                }
            },
            onHover: (e, el) => e.native.target.style.cursor = el[0] ? 'pointer' : 'default',
            plugins: { /* ... as before ... */ },
            scales: { /* ... as before ... */ }
        }
    });
}

// --- DATA TABLE (Updated with clickable rows) ---
function renderDataTable(searchTerm = '') {
    let dataToDisplay = getFilteredData();
    if (searchTerm) dataToDisplay = dataToDisplay.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    fullDataTableHead.innerHTML = `<tr><th>Name</th><th>Type</th><th>ANC</th><th>Sound</th><th>Water Res.</th><th>Price (USD)</th></tr>`;
    fullDataTableBody.innerHTML = dataToDisplay.map(p => `
        <tr data-product-id="${p.id}" style="cursor: pointer;">
            <td>${p.name}</td><td>${p.type}</td><td>${p.specs['Noise Cancellation']}</td><td>${p.specs.Sound}</td><td>${p.specs['Water Resistance']}</td><td>$${p.scores.price}</td>
        </tr>
    `).join('');
}


// --- REUSABLE HTML HELPERS ---
function createPriceListHTML(product) {
    const prices = product.regionalPrices[userRegion] || product.regionalPrices['US'];
    if (!prices) return '<p>No pricing available.</p>';
    return prices.map(p => `<div class="price-item"><span>${p.store}: <strong>${p.currency}${p.price}</strong></span><a href="${p.link}" target="_blank" class="buy-button">Buy</a></div>`).join('');
}

function createProductCardHTML(product, index) {
    return `<div class="product-card"><div class="product-header"><button class="remove-button" data-index="${index}">&times;</button><img src="${product.image}" alt="${product.name}"><h2>${product.name}</h2></div><ul class="spec-list">${Object.entries(product.specs).map(([key, value]) => `<li><span class="spec-label">${key}</span> <span>${value}</span></li>`).join('')}</ul><div class="price-list">${createPriceListHTML(product)}</div></div>`;
}

// All other functions are either included above or can be minified as they are unchanged.
// Minified block for brevity:
async function getUserRegion(){try{const e=await fetch("https://ip-api.com/json/?fields=countryCode");return(await e.json()).countryCode||"US"}catch(e){return console.warn("Could not auto-detect region. Defaulting to 'US'."),"US"}}
function updateLanguage(){const e=translations[userLanguage]||translations.en;D.querySelectorAll("[data-lang]").forEach(t=>{const n=t.getAttribute("data-lang");e[n]&&(t.textContent=e[n])})}
function loadParticleBackground(){tsParticles.load("particles-js",{fpsLimit:60,interactivity:{events:{onHover:{enable:!0,mode:"repulse"},resize:!0},modes:{repulse:{distance:100,duration:.4}}},particles:{color:{value:D.body.dataset.theme==="dark"?"#555":"#ccc"},links:{color:{value:D.body.dataset.theme==="dark"?"#555":"#ccc"},distance:150,enable:!0,opacity:.2,width:1},collisions:{enable:!0},move:{direction:"none",enable:!0,outMode:"bounce",random:!1,speed:1,straight:!1},number:{density:{enable:!0,area:800},value:80},opacity:{value:.2},shape:{type:"circle"},size:{random:!0,value:3}},detectRetina:!0})};
function createPlaceholderCardHTML(e){return`<div class="placeholder-card" data-index="${e}"><span class="add-button">+ Compare</span></div>`};
function addEventListenersToCards(){D.querySelectorAll(".placeholder-card").forEach(e=>{e.addEventListener("click",()=>openModal(e.dataset.index))}),D.querySelectorAll(".remove-button").forEach(e=>{e.addEventListener("click",t=>{t.stopPropagation(),removeProduct(t.dataset.index)})})};
function populateModalList(e=""){const t=getFilteredData();productList.innerHTML="";const n=selectedProducts.filter(e=>e).map(e=>e.id),o=t.filter(t=>t.name.toLowerCase().includes(e.toLowerCase()));o.forEach(e=>{const t=D.createElement("li"),o=n.includes(e.id);t.innerHTML=`<img src="${e.image}" alt=""> <span>${e.name}</span>`,o?t.classList.add("disabled"):t.addEventListener("click",()=>selectProduct(e.id, activeSlotIndex)),productList.appendChild(t)})};

// --- START THE APP ---
initializeApp();
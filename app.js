// --- GLOBAL STATE & VARIABLES ---
let allProducts = []; 
let selectedProducts = [null, null];
let activeSlotIndex = null;
let userRegion = 'US';
let userLanguage = 'en';
let currentFilter = 'all';
let comparisonChart = null;
let scatterPlotChart = null;

// --- DOM ELEMENTS ---
const comparisonGrid = document.getElementById('comparison-grid');
const modal = document.getElementById('product-modal');
const closeModalButton = document.getElementById('close-modal');
const productList = document.getElementById('product-list');
const searchBar = document.getElementById('search-bar');
const menuToggleButton = document.getElementById('menu-toggle-button');
const settingsMenu = document.getElementById('settings-menu');
const countrySelector = document.getElementById('country-selector');
const welcomeCountrySelector = document.getElementById('welcome-country-selector');
const languageSelector = document.getElementById('language-selector');
const chartCategorySelector = document.getElementById('chart-category-selector');
const barChartCanvas = document.getElementById('comparisonChart').getContext('2d');
const scatterPlotCanvas = document.getElementById('scatterPlotChart').getContext('2d');
const filterContainer = document.querySelector('.filter-container');
const welcomeModal = document.getElementById('welcome-modal');
const saveRegionButton = document.getElementById('save-region-button');
const fullDataTableBody = document.querySelector('#full-data-table tbody');
const fullDataTableHead = document.querySelector('#full-data-table thead');
const tableSearchInput = document.getElementById('table-search');

// --- TRANSLATION DICTIONARY ---
const translations = {
    en: { settingsTitle: "Settings", countryLabel: "Country / Region", languageLabel: "Language", mainTitle: "Find Your Perfect Audio Gear", subtitle: "Compare specs and prices for earbuds and headphones.", modalTitle: "Select a Product" },
    de: { settingsTitle: "Einstellungen", countryLabel: "Land / Region", languageLabel: "Sprache", mainTitle: "Finde dein perfektes Audio-Gerät", subtitle: "Vergleiche Daten und Preise für Ohrhörer und Kopfhörer.", modalTitle: "Produkt auswählen" }
};

// --- INITIALIZATION ---
async function initializeApp() {
    loadParticleBackground();
    setupEventListeners();
    await checkAndSetRegion(); // New region logic
    
    try {
        const response = await fetch('./earbuds.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        allProducts = await response.json();
        renderAll();
    } catch (error) {
        console.error("Could not initialize app:", error);
        comparisonGrid.innerHTML = `<p style="text-align: center; color: #ff4d4d;">Error: Could not load product data.</p>`;
    }
}

function renderAll() {
    renderGrid();
    updateLanguage();
    renderOrUpdateChart();
    renderScatterPlot();
    renderDataTable();
}

// --- NEW REGION & WELCOME MODAL LOGIC ---
async function checkAndSetRegion() {
    const savedRegion = localStorage.getItem('userRegion');
    if (savedRegion) {
        userRegion = savedRegion;
        welcomeCountrySelector.value = savedRegion;
        countrySelector.innerHTML = welcomeCountrySelector.innerHTML;
        countrySelector.value = savedRegion;
    } else {
        const detectedRegion = await getUserRegion();
        userRegion = detectedRegion;
        if (document.querySelector(`#welcome-country-selector option[value="${detectedRegion}"]`)) {
            welcomeCountrySelector.value = detectedRegion;
        }
        countrySelector.innerHTML = welcomeCountrySelector.innerHTML;
        countrySelector.value = detectedRegion;
        welcomeModal.classList.add('active');
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    saveRegionButton.addEventListener('click', () => {
        userRegion = welcomeCountrySelector.value;
        localStorage.setItem('userRegion', userRegion);
        countrySelector.value = userRegion;
        welcomeModal.classList.remove('active');
        renderGrid(); // Re-render with new region
    });
    
    menuToggleButton.addEventListener('click', () => settingsMenu.classList.toggle('open'));
    countrySelector.addEventListener('change', (e) => {
        userRegion = e.target.value;
        localStorage.setItem('userRegion', userRegion);
        renderGrid();
    });
    languageSelector.addEventListener('change', (e) => { userLanguage = e.target.value; updateLanguage(); });
    chartCategorySelector.addEventListener('change', renderOrUpdateChart);
    
    filterContainer.addEventListener('change', (e) => {
        if (e.target.name === 'product-type') {
            currentFilter = e.target.value;
            selectedProducts = selectedProducts.map(p => (p && (currentFilter === 'all' || p.type === currentFilter)) ? p : null);
            renderAll();
        }
    });

    tableSearchInput.addEventListener('input', (e) => renderDataTable(e.target.value));
    closeModalButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    searchBar.addEventListener('input', (e) => populateModalList(e.target.value));
}

// --- DATA FILTERING HELPER ---
function getFilteredData() {
    if (currentFilter === 'all') return [...allProducts];
    return allProducts.filter(product => product.type === currentFilter);
}

// --- CLICKABLE BAR CHART ---
function renderOrUpdateChart() {
    let dataToDisplay = getFilteredData();
    if (!dataToDisplay.length) { if (comparisonChart) comparisonChart.destroy(); return; }

    const category = chartCategorySelector.value;
    const isPrice = category === 'price';
    
    dataToDisplay.sort((a, b) => isPrice ? a.scores[category] - b.scores[category] : b.scores[category] - a.scores[category]);

    const chartLabels = dataToDisplay.map(p => p.name);
    const chartData = dataToDisplay.map(p => p.scores[category]);

    if (comparisonChart) comparisonChart.destroy();
    
    document.querySelector('.chart-canvas-container').style.height = `${dataToDisplay.length * 28}px`;

    comparisonChart = new Chart(barChartCanvas, {
        type: 'bar',
        data: { labels: chartLabels, datasets: [{ label: chartCategorySelector.options[chartCategorySelector.selectedIndex].text, data: chartData, backgroundColor: 'rgba(0, 123, 255, 0.6)', borderColor: 'rgba(0, 123, 255, 1)', borderWidth: 1 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            onClick: (e) => {
                const points = comparisonChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const firstPoint = points[0];
                    const product = dataToDisplay[firstPoint.index];
                    const prices = product.regionalPrices[userRegion] || product.regionalPrices['US'];
                    if (prices && prices.length > 0) {
                        window.open(prices[0].link, '_blank');
                    }
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            plugins: { legend: { display: false }, tooltip: { /* ... as before ... */ } },
            scales: { x: { beginAtZero: true, ticks: { color: '#aaa' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, y: { ticks: { color: '#aaa', autoSkip: false }, grid: { display: false } } }
        }
    });
}

// --- NEW SCATTER PLOT ---
function renderScatterPlot() {
    let dataToDisplay = getFilteredData();
    if (!dataToDisplay.length) { if (scatterPlotChart) scatterPlotChart.destroy(); return; }

    const plotData = dataToDisplay.map(p => ({
        x: p.scores.price,
        y: p.scores.sound_score,
        label: p.name
    }));

    if (scatterPlotChart) scatterPlotChart.destroy();

    scatterPlotChart = new Chart(scatterPlotCanvas, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Price vs. Sound',
                data: plotData,
                backgroundColor: 'rgba(0, 123, 255, 0.7)'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw.label + ` ($${context.raw.x}, Score: ${context.raw.y})`;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Price (USD)', color: '#fff' }, ticks: { color: '#aaa' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                y: { title: { display: true, text: 'Sound Score', color: '#fff' }, ticks: { color: '#aaa' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
            }
        }
    });
}

// --- NEW DATA TABLE ---
function renderDataTable(searchTerm = '') {
    let dataToDisplay = getFilteredData();
    
    if (searchTerm) {
        dataToDisplay = dataToDisplay.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    fullDataTableHead.innerHTML = `
        <tr>
            <th>Name</th><th>Type</th><th>ANC</th><th>Sound</th><th>Water Res.</th><th>Price (USD)</th>
        </tr>
    `;
    
    fullDataTableBody.innerHTML = dataToDisplay.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.type}</td>
            <td>${p.specs['Noise Cancellation']}</td>
            <td>${p.specs['Sound']}</td>
            <td>${p.specs['Water Resistance']}</td>
            <td>$${p.scores.price}</td>
        </tr>
    `).join('');
}

// --- CORE LOGIC (UNCHANGED/MINIFIED) ---
async function getUserRegion(){try{const e=await fetch("https://ip-api.com/json/?fields=countryCode");return(await e.json()).countryCode||"US"}catch(e){return console.warn("Could not auto-detect region. Defaulting to 'US'."),"US"}}
function updateLanguage(){const e=translations[userLanguage]||translations.en;document.querySelectorAll("[data-lang]").forEach(t=>{const n=t.getAttribute("data-lang");e[n]&&(t.textContent=e[n])})}
function createProductCardHTML(e,t){let n=e.regionalPrices[userRegion]||e.regionalPrices.US;if(!n||0===n.length)return"<p>No pricing available for your region.</p>";n.sort((e,t)=>e.price-t.price);const o=Object.entries(e.specs).map(([e,t])=>`<li><span class="spec-label">${e}</span> <span>${t}</span></li>`).join(""),r=n.map(e=>`<div class="price-item"><span>${e.store}: <strong>${e.currency}${e.price}</strong></span><a href="${e.link}" target="_blank" class="buy-button">Buy</a></div>`).join("");return`<div class="product-card"><div class="product-header"><button class="remove-button" data-index="${t}">&times;</button><img src="${e.image}" alt="${e.name}"><h2>${e.name}</h2></div><ul class="spec-list">${o}</ul><div class="price-list">${r}</div></div>`}
function loadParticleBackground(){tsParticles.load("particles-js",{fpsLimit:60,interactivity:{events:{onHover:{enable:!0,mode:"repulse"},resize:!0},modes:{repulse:{distance:100,duration:.4}}},particles:{color:{value:"#555"},links:{color:"#555",distance:150,enable:!0,opacity:.2,width:1},collisions:{enable:!0},move:{direction:"none",enable:!0,outMode:"bounce",random:!1,speed:1,straight:!1},number:{density:{enable:!0,area:800},value:80},opacity:{value:.2},shape:{type:"circle"},size:{random:!0,value:3}},detectRetina:!0})};
function renderGrid(){comparisonGrid.innerHTML="",selectedProducts.forEach((e,t)=>{let n;n=e?createProductCardHTML(e,t):createPlaceholderCardHTML(t),comparisonGrid.innerHTML+=n}),addEventListenersToCards()};
function createPlaceholderCardHTML(e){return`<div class="placeholder-card" data-index="${e}"><span class="add-button">+ Compare</span></div>`};
function addEventListenersToCards(){document.querySelectorAll(".placeholder-card").forEach(e=>{e.addEventListener("click",()=>openModal(e.dataset.index))}),document.querySelectorAll(".remove-button").forEach(e=>{e.addEventListener("click",t=>{t.stopPropagation(),removeProduct(e.dataset.index)})})};
function openModal(e){activeSlotIndex=parseInt(e),populateModalList(),modal.classList.add('active')};
function closeModal(){modal.classList.remove('active')};
function populateModalList(e=""){const t=getFilteredData();productList.innerHTML="";const n=selectedProducts.filter(e=>e).map(e=>e.id),o=t.filter(t=>t.name.toLowerCase().includes(e.toLowerCase()));o.forEach(e=>{const t=document.createElement("li"),o=n.includes(e.id);t.innerHTML=`<img src="${e.image}" alt=""> <span>${e.name}</span>`,o?t.classList.add("disabled"):t.addEventListener("click",()=>selectProduct(e.id)),productList.appendChild(t)})};
function selectProduct(e){const t=allProducts.find(t=>t.id===parseInt(e));selectedProducts[activeSlotIndex]=t,closeModal(),renderGrid()};
function removeProduct(e){selectedProducts[e]=null,renderGrid()};

// --- START THE APP ---
initializeApp();
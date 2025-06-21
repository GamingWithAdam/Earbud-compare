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

// --- TRANSLATION DICTIONARY (EXPANDED) ---
const translations = {
    en: {
        settingsTitle: "Settings", countryLabel: "Country / Region", languageLabel: "Language", mainTitle: "Find Your Perfect Audio Gear", subtitle: "Compare specs and prices for earbuds and headphones.", modalTitle: "Select a Product"
    },
    de: {
        settingsTitle: "Einstellungen", countryLabel: "Land / Region", languageLabel: "Sprache", mainTitle: "Finde dein perfektes Audio-Gerät", subtitle: "Vergleiche Daten und Preise für Ohrhörer und Kopfhörer.", modalTitle: "Produkt auswählen"
    },
    es: {
        settingsTitle: "Ajustes", countryLabel: "País / Región", languageLabel: "Idioma", mainTitle: "Encuentra tu Equipo de Audio Perfecto", subtitle: "Compara especificaciones y precios de auriculares y cascos.", modalTitle: "Seleccionar un Producto"
    },
    fr: {
        settingsTitle: "Paramètres", countryLabel: "Pays / Région", languageLabel: "Langue", mainTitle: "Trouvez Votre Équipement Audio Parfait", subtitle: "Comparez les spécifications et les prix des écouteurs et des casques.", modalTitle: "Sélectionner un Produit"
    },
    ja: {
        settingsTitle: "設定", countryLabel: "国・地域", languageLabel: "言語", mainTitle: "完璧なオーディオ機器を見つけよう", subtitle: "イヤホンとヘッドホンのスペックと価格を比較します。", modalTitle: "製品を選択"
    }
};

// --- INITIALIZATION ---
async function initializeApp() {
    setupEventListeners();
    applyTheme(localStorage.getItem('theme') || 'system');
    await checkAndSetRegion();
    try {
        const response = await fetch('./earbuds.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allProducts = await response.json();
        renderAll(); 
    } catch (error) { 
        console.error("Could not initialize app:", error); 
        const contentWrapper = D.querySelector('.content-wrapper');
        contentWrapper.innerHTML = `<p style="text-align: center; color: red; font-size: 1.2rem; padding: 5rem;">Failed to load product database. Please check your connection and try again.</p>`;
    }
}

// --- MASTER RENDER FUNCTION ---
function renderAll() {
    renderGridAndComparisonTable();
    updateLanguage();
    renderOrUpdateChart();
    renderScatterPlot();
    renderDataTable();
}

// --- THEME LOGIC ---
function applyTheme(theme) {
    themeSelector.value = theme;
    localStorage.setItem('theme', theme);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    D.body.dataset.theme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;
    
    if (allProducts.length > 0) {
        renderOrUpdateChart();
        renderScatterPlot();
    }
    loadParticleBackground();
}

// --- REGION LOGIC ---
async function checkAndSetRegion() {
    const countryOptionsHTML = `<option value="US">United States</option><option value="GB">United Kingdom</option><option value="DE">Germany</option><option value="CA">Canada</option><option value="AU">Australia</option>`;
    welcomeCountrySelector.innerHTML = countryOptionsHTML;
    countrySelector.innerHTML = countryOptionsHTML;
    
    const savedRegion = localStorage.getItem('userRegion');
    if (savedRegion) {
        userRegion = savedRegion;
    } else {
        userRegion = await getUserRegion();
        welcomeModal.classList.add('active');
    }
    welcomeCountrySelector.value = userRegion;
    countrySelector.value = userRegion;
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    saveRegionButton.addEventListener('click', () => {
        userRegion = welcomeCountrySelector.value;
        localStorage.setItem('userRegion', userRegion);
        countrySelector.value = userRegion;
        welcomeModal.classList.remove('active');
        renderGridAndComparisonTable();
    });
    
    menuToggleButton.addEventListener('click', () => settingsMenu.classList.toggle('open'));
    countrySelector.addEventListener('change', (e) => { userRegion = e.target.value; localStorage.setItem('userRegion', userRegion); renderGridAndComparisonTable(); });
    languageSelector.addEventListener('change', (e) => { userLanguage = e.target.value; updateLanguage(); });
    themeSelector.addEventListener('change', (e) => applyTheme(e.target.value));
    chartCategorySelector.addEventListener('change', renderOrUpdateChart);
    
    filterContainer.addEventListener('change', (e) => {
        if (e.target.name === 'product-type') {
            currentFilter = e.target.value;
            selectedProducts = selectedProducts.map(p => (p && (currentFilter === 'all' || p.type === currentFilter)) ? p : null);
            renderAll();
        }
    });

    tabsContainer.addEventListener('click', (e) => {
        if (e.target.matches('.tab-link:not(.active)')) {
            tabsContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            const targetTab = D.getElementById(e.target.dataset.tab);
            targetTab.classList.add('active');
            
            const tabId = e.target.dataset.tab;
            if (tabId === 'tab-market-chart') renderOrUpdateChart();
            if (tabId === 'tab-value-plot') renderScatterPlot();
            if (tabId === 'tab-direct-compare') renderGridAndComparisonTable();
            if (tabId === 'tab-data-table') renderDataTable();
        }
    });

    tableSearchInput.addEventListener('input', (e) => renderDataTable(e.target.value));
    closeAddModalButton.addEventListener('click', closeModal);
    addProductModal.addEventListener('click', (e) => { if (e.target === addProductModal) closeModal(); });
    quickViewModal.addEventListener('click', (e) => { if (e.target === quickViewModal) closeQuickViewModal(); });
    searchBar.addEventListener('input', (e) => populateModalList(e.target.value));
}

// --- ALL OTHER FUNCTIONS (UNCHANGED LOGIC, MINIFIED FOR BREVITY) ---
function getFilteredData(){return"all"===currentFilter?[...allProducts]:allProducts.filter(e=>e.type===currentFilter)}
function openModal(e){activeSlotIndex=e,populateModalList(),addProductModal.classList.add("active")}
function closeModal(){addProductModal.classList.remove("active")}
function openQuickViewModal(e){const t=allProducts.find(t=>t.id===e);if(!t)return;quickViewContent.innerHTML=`\n        <button id="close-quick-view" class="close-button">&times;</button>\n        <div class="product-header"><img src="${t.image}" alt="${t.name}"><h2>${t.name}</h2></div>\n        <ul class="spec-list">${Object.entries(t.specs).map(([e,t])=>`<li><span class="spec-label">${e}</span> <span>${t}</span></li>`).join("")}</ul>\n        <div class="price-list">${createPriceListHTML(t)}</div>\n        <button class="add-to-compare-btn" data-product-id="${t.id}">+ Add to Compare</button>`,quickViewModal.classList.add("active"),D.getElementById("close-quick-view").addEventListener("click",closeQuickViewModal),D.querySelector(".add-to-compare-btn").addEventListener("click",(e=>{const t=parseInt(e.target.dataset.productId),n=selectedProducts.findIndex(e=>null===e);selectProduct(t,-1!==n?n:selectedProducts.length),closeQuickViewModal()}))}
function closeQuickViewModal(){quickViewModal.classList.remove("active")}
function renderGridAndComparisonTable(){comparisonGrid.innerHTML="",selectedProducts.forEach(((e,t)=>{comparisonGrid.innerHTML+=e?createProductCardHTML(e,t):createPlaceholderCardHTML(t)})),null!==selectedProducts[selectedProducts.length-1]&&(comparisonGrid.innerHTML+=createPlaceholderCardHTML(selectedProducts.length)),addEventListenersToCards(),renderDirectComparisonTable()}
function selectProduct(e,t){const n=allProducts.find(t=>t.id===parseInt(e));t>=selectedProducts.length?selectedProducts.push(n):selectedProducts[t]=n,closeModal(),renderGridAndComparisonTable()}
function removeProduct(e){selectedProducts.splice(e,1),selectedProducts.length<2&&selectedProducts.push(null),renderGridAndComparisonTable()}
function renderDirectComparisonTable(){const e=selectedProducts.filter(e=>null!==e);if(e.length<1)return void(directComparisonContainer.style.display="none");directComparisonContainer.style.display="block";const t=["Price",...Object.keys(e[0].specs)];let n="<thead><tr><th>Feature</th>";e.forEach((e=>{n+=`<th><img src="${e.image}" class="product-image" alt="${e.name}"><br>${e.name}</th>`})),n+="</tr></thead><tbody>",t.forEach((t=>{n+=`<tr><td><strong>${t}</strong></td>`,e.forEach((e=>{let o="";o="Price"===t?`${(e.regionalPrices[userRegion]||e.regionalPrices.US)[0].currency}${(e.regionalPrices[userRegion]||e.regionalPrices.US)[0].price}`:e.specs[t]||"N/A",n+=`<td>${o}</td>`})),n+="</tr>"})),directComparisonTable.innerHTML=n+"</tbody>"}
function renderOrUpdateChart(){let e=getFilteredData();if(!e.length)return void(comparisonChart&&comparisonChart.destroy());const t=chartCategorySelector.value,n=t==="price";e.sort(((e,o)=>n?e.scores[t]-o.scores[t]:o.scores[t]-e.scores[t])),comparisonChart&&comparisonChart.destroy(),D.querySelector("#comparisonChart").parentElement.style.height=`${e.length*28}px`,comparisonChart=new Chart(barChartCanvas,{type:"bar",data:{labels:e.map((e=>e.name)),datasets:[{label:chartCategorySelector.options[chartCategorySelector.selectedIndex].text,data:e.map((e=>e.scores[t])),backgroundColor:"rgba(0, 123, 255, 0.6)",borderColor:"rgba(0, 123, 255, 1)",borderWidth:1}]},options:{indexAxis:"y",responsive:!0,maintainAspectRatio:!1,onClick:(t=>{const n=comparisonChart.getElementsAtEventForMode(t,"nearest",{intersect:!0},!0);n.length&&openQuickViewModal(e[n[0].index].id)}),onHover:((e,t)=>{e.native.target.style.cursor=t[0]?"pointer":"default"}),plugins:{legend:{display:!1},tooltip:{callbacks:{label:e=>` ${e.dataset.label||""}: ${n?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(e.parsed.x):e.parsed.x}`}}},scales:{x:{ticks:{color:"var(--secondary-text-color)"},grid:{color:"var(--card-border-color)"}},y:{ticks:{color:"var(--secondary-text-color)",autoSkip:!1},grid:{display:!1}}}}})}
function renderScatterPlot(){let e=getFilteredData();if(!e.length)return void(scatterPlotChart&&scatterPlotChart.destroy());const t=e.map((e=>({x:e.scores.price,y:e.scores.sound_score,label:e.name,id:e.id})));scatterPlotChart&&scatterPlotChart.destroy(),scatterPlotChart=new Chart(scatterPlotCanvas,{type:"scatter",data:{datasets:[{label:"Price vs. Sound",data:t,backgroundColor:"rgba(0, 123, 255, 0.7)"}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(e=>{const t=scatterPlotChart.getElementsAtEventForMode(e,"nearest",{intersect:!0},!0);t.length&&openQuickViewModal(plotData[t[0].index].id)}),onHover:((e,t)=>{e.native.target.style.cursor=t[0]?"pointer":"default"}),plugins:{legend:{display:!1},tooltip:{callbacks:{label:e=>`${e.raw.label} ($${e.raw.x}, Score: ${e.raw.y})`}}},scales:{x:{title:{display:!0,text:"Price (USD)",color:"var(--primary-text-color)"},ticks:{color:"var(--secondary-text-color)"},grid:{color:"var(--card-border-color)"}},y:{title:{display:!0,text:"Sound Score",color:"var(--primary-text-color)"},ticks:{color:"var(--secondary-text-color)"},grid:{color:"var(--card-border-color)"}}}}})}
function renderDataTable(e=""){let t=getFilteredData();e&&(t=t.filter((t=>t.name.toLowerCase().includes(e.toLowerCase())))),fullDataTableHead.innerHTML="<tr><th>Name</th><th>Type</th><th>ANC</th><th>Sound</th><th>Water Res.</th><th>Price (USD)</th></tr>",fullDataTableBody.innerHTML=t.map((e=>`<tr data-product-id="${e.id}" style="cursor: pointer;"><td>${e.name}</td><td>${e.type}</td><td>${e.specs["Noise Cancellation"]}</td><td>${e.specs.Sound}</td><td>${e.specs["Water Resistance"]}</td><td>$${e.scores.price}</td></tr>`)).join("")}
async function getUserRegion(){try{const e=await fetch("https://ip-api.com/json/?fields=countryCode");return(await e.json()).countryCode||"US"}catch(e){return console.warn("Could not auto-detect region. Defaulting to 'US'."),"US"}}
function updateLanguage(){const e=translations[userLanguage]||translations.en;D.querySelectorAll("[data-lang]").forEach((t=>{const n=t.getAttribute("data-lang");e[n]&&(t.textContent=e[n])}))}
function createPriceListHTML(e){const t=e.regionalPrices[userRegion]||e.regionalPrices.US;return t?t.map((e=>`<div class="price-item"><span>${e.store}: <strong>${e.currency}${e.price}</strong></span><a href="${e.link}" target="_blank" class="buy-button">Buy</a></div>`)).join(""):"<p>No pricing available.</p>"}
function createProductCardHTML(e,t){return`<div class="product-card"><div class="product-header"><button class="remove-button" data-index="${t}">&times;</button><img src="${e.image}" alt="${e.name}"><h2>${e.name}</h2></div><ul class="spec-list">${Object.entries(e.specs).map(([e,t])=>`<li><span class="spec-label">${e}</span> <span>${t}</span></li>`).join("")}</ul><div class="price-list">${createPriceListHTML(e)}</div></div>`}
function loadParticleBackground(){tsParticles.load("particles-js",{fpsLimit:60,interactivity:{events:{onHover:{enable:!0,mode:"repulse"},resize:!0},modes:{repulse:{distance:100,duration:.4}}},particles:{color:{value:D.body.dataset.theme==="dark"?"#555":"#ccc"},links:{color:{value:D.body.dataset.theme==="dark"?"#555":"#ccc"},distance:150,enable:!0,opacity:.2,width:1},collisions:{enable:!0},move:{direction:"none",enable:!0,outMode:"bounce",random:!1,speed:1,straight:!1},number:{density:{enable:!0,area:800},value:80},opacity:{value:.2},shape:{type:"circle"},size:{random:!0,value:3}},detectRetina:!0})};
function createPlaceholderCardHTML(e){return`<div class="placeholder-card" data-index="${e}"><span class="add-button">+ Compare</span></div>`};
function addEventListenersToCards(){D.querySelectorAll(".placeholder-card").forEach((e=>{e.addEventListener("click",(()=>openModal(e.dataset.index))})),D.querySelectorAll(".remove-button").forEach((e=>{e.addEventListener("click",(t=>{t.stopPropagation(),removeProduct(t.dataset.index)}))}))}
function populateModalList(e=""){const t=getFilteredData();productList.innerHTML="";const n=selectedProducts.filter((e=>e)).map((e=>e.id)),o=t.filter((t=>t.name.toLowerCase().includes(e.toLowerCase())));o.forEach((e=>{const t=D.createElement("li"),o=n.includes(e.id);t.innerHTML=`<img src="${e.image}" alt=""> <span>${e.name}</span>`,o?t.classList.add("disabled"):t.addEventListener("click",(()=>selectProduct(e.id,activeSlotIndex))),productList.appendChild(t)}))};

// --- START THE APP ---
initializeApp();
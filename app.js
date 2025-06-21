// --- GLOBAL STATE & VARIABLES ---
let allProducts = []; 
let selectedProducts = [null, null]; // Start with 2 slots
let activeSlotIndex = null;
let userRegion = 'US';
let userLanguage = 'en';
let currentFilter = 'all';
let comparisonChart = null, scatterPlotChart = null;

// --- DOM ELEMENTS ---
const D = document;
const comparisonGrid = D.getElementById('comparison-grid');
const modal = D.getElementById('product-modal');
const closeModalButton = D.getElementById('close-modal');
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

// --- TRANSLATION DICTIONARY ---
const translations = {
    en: { settingsTitle: "Settings", countryLabel: "Country / Region", languageLabel: "Language", mainTitle: "Find Your Perfect Audio Gear", subtitle: "Compare specs and prices for earbuds and headphones.", modalTitle: "Select a Product" },
    de: { settingsTitle: "Einstellungen", countryLabel: "Land / Region", languageLabel: "Sprache", mainTitle: "Finde dein perfektes Audio-Gerät", subtitle: "Vergleiche Daten und Preise für Ohrhörer und Kopfhörer.", modalTitle: "Produkt auswählen" }
};

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
    } catch (error) {
        console.error("Could not initialize app:", error);
    }
}

function renderAll() {
    renderGrid();
    renderDirectComparisonTable();
    updateLanguage();
    renderOrUpdateChart();
    renderScatterPlot();
    renderDataTable();
}

// --- NEW THEME LOGIC ---
function applyTheme(theme) {
    themeSelector.value = theme;
    localStorage.setItem('theme', theme);
    if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        D.body.dataset.theme = systemPrefersDark ? 'dark' : 'light';
    } else {
        D.body.dataset.theme = theme;
    }
    // Re-render charts as their colors might depend on the theme
    if(allProducts.length > 0) {
        renderOrUpdateChart();
        renderScatterPlot();
    }
}

// --- NEW REGION & WELCOME MODAL LOGIC ---
async function checkAndSetRegion() {
    const countryOptionsHTML = `<option value="US">United States</option><option value="GB">United Kingdom</option><option value="DE">Germany</option><option value="CA">Canada</option><option value="AU">Australia</option>`;
    welcomeCountrySelector.innerHTML = countryOptionsHTML;
    countrySelector.innerHTML = countryOptionsHTML;

    const savedRegion = localStorage.getItem('userRegion');
    if (savedRegion) {
        userRegion = savedRegion;
        countrySelector.value = savedRegion;
    } else {
        const detectedRegion = await getUserRegion();
        userRegion = detectedRegion;
        if (D.querySelector(`#welcome-country-selector option[value="${detectedRegion}"]`)) {
            welcomeCountrySelector.value = detectedRegion;
        }
        welcomeModal.classList.add('active');
    }
    countrySelector.value = userRegion;
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    saveRegionButton.addEventListener('click', () => {
        userRegion = welcomeCountrySelector.value;
        localStorage.setItem('userRegion', userRegion);
        countrySelector.value = userRegion;
        welcomeModal.classList.remove('active');
        renderGrid();
    });
    
    menuToggleButton.addEventListener('click', () => settingsMenu.classList.toggle('open'));
    countrySelector.addEventListener('change', (e) => { userRegion = e.target.value; localStorage.setItem('userRegion', userRegion); renderAll(); });
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
        if (e.target.classList.contains('tab-link')) {
            tabsContainer.querySelector('.active').classList.remove('active');
            tabContents.forEach(content => content.classList.remove('active'));
            e.target.classList.add('active');
            D.getElementById(e.target.dataset.tab).classList.add('active');
        }
    });

    tableSearchInput.addEventListener('input', (e) => renderDataTable(e.target.value));
    closeModalButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    searchBar.addEventListener('input', (e) => populateModalList(e.target.value));
}

// --- NEW DYNAMIC COMPARISON ---
function renderGrid() {
    comparisonGrid.innerHTML = '';
    selectedProducts.forEach((product, index) => {
        comparisonGrid.innerHTML += product ? createProductCardHTML(product, index) : createPlaceholderCardHTML(index);
    });

    // Add a new placeholder if the last one is filled and there are more products to add
    if (selectedProducts[selectedProducts.length - 1] !== null) {
        comparisonGrid.innerHTML += createPlaceholderCardHTML(selectedProducts.length);
    }
    addEventListenersToCards();
}

function selectProduct(productId) {
    const product = allProducts.find(p => p.id === parseInt(productId));
    if (activeSlotIndex >= selectedProducts.length) {
        selectedProducts.push(product);
    } else {
        selectedProducts[activeSlotIndex] = product;
    }
    closeModal();
    renderGrid();
    renderDirectComparisonTable();
}

function removeProduct(index) {
    selectedProducts.splice(index, 1);
    if (selectedProducts.length < 2) {
        selectedProducts.push(null); // Ensure there are at least 2 slots
    }
    renderGrid();
    renderDirectComparisonTable();
}

// --- NEW DIRECT COMPARISON TABLE ---
function renderDirectComparisonTable() {
    const currentlyCompared = selectedProducts.filter(p => p !== null);
    if (currentlyCompared.length < 2) {
        directComparisonContainer.style.display = 'none';
        return;
    }
    directComparisonContainer.style.display = 'block';

    const allSpecKeys = ['Price', ...Object.keys(currentlyCompared[0].specs)];
    
    let tableHTML = '<thead><tr><th>Feature</th>';
    currentlyCompared.forEach(p => tableHTML += `<th><img src="${p.image}" class="product-image" alt="${p.name}"><br>${p.name}</th>`);
    tableHTML += '</tr></thead><tbody>';

    allSpecKeys.forEach(key => {
        tableHTML += `<tr><td><strong>${key}</strong></td>`;
        currentlyCompared.forEach(p => {
            let value = '';
            if (key === 'Price') {
                const prices = p.regionalPrices[userRegion] || p.regionalPrices['US'];
                value = prices ? `${prices[0].currency}${prices[0].price}` : 'N/A';
            } else {
                value = p.specs[key] || 'N/A';
            }
            tableHTML += `<td>${value}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody>';
    directComparisonTable.innerHTML = tableHTML;
}

// --- ALL OTHER FUNCTIONS (MINIFIED FOR BREVITY, BUT UNCHANGED LOGIC) ---
function getFilteredData(){return"all"===currentFilter?[...allProducts]:allProducts.filter(e=>e.type===currentFilter)}
function renderOrUpdateChart(){let e=getFilteredData();if(e.length){const t=chartCategorySelector.value,o="price"===t;e.sort((e,n)=>o?e.scores[t]-n.scores[t]:n.scores[t]-e.scores[t]);const r=e.map(e=>e.name),s=e.map(e=>e.scores[t]);comparisonChart&&comparisonChart.destroy(),document.querySelector("#comparisonChart").parentElement.style.height=`${e.length*28}px`,comparisonChart=new Chart(barChartCanvas,{type:"bar",data:{labels:r,datasets:[{label:chartCategorySelector.options[chartCategorySelector.selectedIndex].text,data:s,backgroundColor:"rgba(0, 123, 255, 0.6)",borderColor:"rgba(0, 123, 255, 1)",borderWidth:1}]},options:{indexAxis:"y",responsive:!0,maintainAspectRatio:!1,onClick:(t=>{const o=comparisonChart.getElementsAtEventForMode(t,"nearest",{intersect:!0},!0);if(o.length){const t=o[0],n=e[t.index],r=n.regionalPrices[userRegion]||n.regionalPrices.US;r&&r.length>0&&window.open(r[0].link,"_blank")}}),onHover:((e,t)=>{e.native.target.style.cursor=t[0]?"pointer":"default"}),plugins:{legend:{display:!1},tooltip:{callbacks:{label:function(e){let t=e.dataset.label||"";return t&&(t+=": "),null!==e.parsed.x&&(t+=o?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(e.parsed.x):e.parsed.x)," "+t}}}},scales:{x:{beginAtZero:!0,ticks:{color:"#aaa"},grid:{color:"rgba(255, 255, 255, 0.1)"}},y:{ticks:{color:"#aaa",autoSkip:!1},grid:{display:!1}}}}})}}
function renderScatterPlot(){let e=getFilteredData();if(e.length){const t=e.map(e=>({x:e.scores.price,y:e.scores.sound_score,label:e.name}));scatterPlotChart&&scatterPlotChart.destroy(),scatterPlotChart=new Chart(scatterPlotCanvas,{type:"scatter",data:{datasets:[{label:"Price vs. Sound",data:t,backgroundColor:"rgba(0, 123, 255, 0.7)"}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:function(e){return`${e.raw.label} ($${e.raw.x}, Score: ${e.raw.y})`}}}},scales:{x:{type:"linear",position:"bottom",title:{display:!0,text:"Price (USD)",color:D.body.dataset.theme==="dark"?"#fff":"#333"},ticks:{color:"#aaa"},grid:{color:"rgba(128, 128, 128, 0.1)"}},y:{title:{display:!0,text:"Sound Score",color:D.body.dataset.theme==="dark"?"#fff":"#333"},ticks:{color:"#aaa"},grid:{color:"rgba(128, 128, 128, 0.1)"}}}}})}}
function renderDataTable(e=""){let t=getFilteredData();e&&(t=t.filter(t=>t.name.toLowerCase().includes(e.toLowerCase()))),fullDataTableHead.innerHTML="<tr><th>Name</th><th>Type</th><th>ANC</th><th>Sound</th><th>Water Res.</th><th>Price (USD)</th></tr>",fullDataTableBody.innerHTML=t.map(e=>`<tr><td>${e.name}</td><td>${e.type}</td><td>${e.specs["Noise Cancellation"]}</td><td>${e.specs.Sound}</td><td>${e.specs["Water Resistance"]}</td><td>$${e.scores.price}</td></tr>`).join("")}
async function getUserRegion(){try{const e=await fetch("https://ip-api.com/json/?fields=countryCode");return(await e.json()).countryCode||"US"}catch(e){return console.warn("Could not auto-detect region. Defaulting to 'US'."),"US"}}
function updateLanguage(){const e=translations[userLanguage]||translations.en;D.querySelectorAll("[data-lang]").forEach(t=>{const n=t.getAttribute("data-lang");e[n]&&(t.textContent=e[n])})}
function createProductCardHTML(e,t){let n=e.regionalPrices[userRegion]||e.regionalPrices.US;if(!n||0===n.length)return"<p>No pricing available for your region.</p>";n.sort((e,t)=>e.price-t.price);const o=Object.entries(e.specs).map(([e,t])=>`<li><span class="spec-label">${e}</span> <span>${t}</span></li>`).join(""),r=n.map(e=>`<div class="price-item"><span>${e.store}: <strong>${e.currency}${e.price}</strong></span><a href="${e.link}" target="_blank" class="buy-button">Buy</a></div>`).join("");return`<div class="product-card"><div class="product-header"><button class="remove-button" data-index="${t}">&times;</button><img src="${e.image}" alt="${e.name}"><h2>${e.name}</h2></div><ul class="spec-list">${o}</ul><div class="price-list">${r}</div></div>`}
function loadParticleBackground(){tsParticles.load("particles-js",{fpsLimit:60,interactivity:{events:{onHover:{enable:!0,mode:"repulse"},resize:!0},modes:{repulse:{distance:100,duration:.4}}},particles:{color:{value:D.body.dataset.theme==="dark"?"#555":"#ccc"},links:{color:{value:D.body.dataset.theme==="dark"?"#555":"#ccc"},distance:150,enable:!0,opacity:.2,width:1},collisions:{enable:!0},move:{direction:"none",enable:!0,outMode:"bounce",random:!1,speed:1,straight:!1},number:{density:{enable:!0,area:800},value:80},opacity:{value:.2},shape:{type:"circle"},size:{random:!0,value:3}},detectRetina:!0})};
function addEventListenersToCards(){D.querySelectorAll(".placeholder-card").forEach(e=>{e.addEventListener("click",()=>openModal(e.dataset.index))}),D.querySelectorAll(".remove-button").forEach(e=>{e.addEventListener("click",t=>{t.stopPropagation(),removeProduct(e.dataset.index)})})};
function openModal(e){activeSlotIndex=parseInt(e),populateModalList(),modal.classList.add('active')};
function closeModal(){modal.classList.remove('active')};
function populateModalList(e=""){const t=getFilteredData();productList.innerHTML="";const n=selectedProducts.filter(e=>e).map(e=>e.id),o=t.filter(t=>t.name.toLowerCase().includes(e.toLowerCase()));o.forEach(e=>{const t=D.createElement("li"),o=n.includes(e.id);t.innerHTML=`<img src="${e.image}" alt=""> <span>${e.name}</span>`,o?t.classList.add("disabled"):t.addEventListener("click",()=>selectProduct(e.id)),productList.appendChild(t)})};

// --- START THE APP ---
initializeApp();
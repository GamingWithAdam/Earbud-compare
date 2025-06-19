// --- GLOBAL STATE & VARIABLES ---
let allEarbuds = []; 
let selectedProducts = [null, null];
let activeSlotIndex = null;
let userRegion = 'US';
let userLanguage = 'en';
let comparisonChart = null; // Holds the chart instance

// --- DOM ELEMENTS ---
const comparisonGrid = document.getElementById('comparison-grid');
const modal = document.getElementById('product-modal');
const closeModalButton = document.getElementById('close-modal');
const productList = document.getElementById('product-list');
const searchBar = document.getElementById('search-bar');
const menuToggleButton = document.getElementById('menu-toggle-button');
const settingsMenu = document.getElementById('settings-menu');
const countrySelector = document.getElementById('country-selector');
const languageSelector = document.getElementById('language-selector');
const chartCategorySelector = document.getElementById('chart-category-selector');
const chartCanvas = document.getElementById('comparisonChart').getContext('2d'); // Get the 2D context

// --- TRANSLATION DICTIONARY ---
const translations = {
    en: { settingsTitle: "Settings", countryLabel: "Country / Region", languageLabel: "Language", mainTitle: "Find Your Perfect Earbuds", subtitle: "Select up to two products below to compare specs and prices.", modalTitle: "Select an Earbud" },
    de: { settingsTitle: "Einstellungen", countryLabel: "Land / Region", languageLabel: "Sprache", mainTitle: "Finde deine perfekten Ohrhörer", subtitle: "Wähle bis zu zwei Produkte aus, um Daten und Preise zu vergleichen.", modalTitle: "Ohrhörer auswählen" }
};

// --- INITIALIZATION ---
async function initializeApp() {
    loadParticleBackground();
    setupEventListeners();
    try {
        const detectedRegion = await getUserRegion();
        userRegion = detectedRegion;
        if(document.querySelector(`#country-selector option[value="${userRegion}"]`)) {
            countrySelector.value = userRegion;
        }

        const response = await fetch('./earbuds.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        allEarbuds = await response.json();
        renderGrid();
        updateLanguage();
        renderOrUpdateChart(); // Initial chart render
    } catch (error) {
        console.error("Could not initialize app:", error);
        comparisonGrid.innerHTML = `<p style="text-align: center; color: #ff4d4d;">Error: Could not load product data.</p>`;
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    menuToggleButton.addEventListener('click', () => settingsMenu.classList.toggle('open'));
    countrySelector.addEventListener('change', (e) => { userRegion = e.target.value; renderGrid(); });
    languageSelector.addEventListener('change', (e) => { userLanguage = e.target.value; updateLanguage(); });
    chartCategorySelector.addEventListener('change', renderOrUpdateChart);
    closeModalButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    searchBar.addEventListener('input', (e) => populateModalList(e.target.value));
}

// --- CHART FUNCTION ---
function renderOrUpdateChart() {
    if (!allEarbuds.length) return;

    const category = chartCategorySelector.value;
    const isPrice = category === 'price';

    // Sort data so the chart is ordered
    allEarbuds.sort((a, b) => {
        // For price, lower is better. For everything else, higher is better.
        return isPrice ? a.scores[category] - b.scores[category] : b.scores[category] - a.scores[category];
    });

    const chartLabels = allEarbuds.map(p => p.name);
    const chartData = allEarbuds.map(p => p.scores[category]);

    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    // Set chart canvas container height dynamically
    const canvasContainer = document.querySelector('.chart-canvas-container');
    canvasContainer.style.height = `${allEarbuds.length * 28}px`;

    comparisonChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: chartCategorySelector.options[chartCategorySelector.selectedIndex].text,
                data: chartData,
                backgroundColor: 'rgba(0, 123, 255, 0.6)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.x !== null) {
                                if (isPrice) {
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.x);
                                } else {
                                    label += context.parsed.x;
                                }
                            }
                            return " " + label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#aaa', autoSkip: false },
                    grid: { display: false }
                }
            }
        }
    });
}

// --- CORE LOGIC (UNCHANGED)---
function updateLanguage(){const t=translations[userLanguage]||translations.en;document.querySelectorAll("[data-lang]").forEach(e=>{const o=e.getAttribute("data-lang");t[o]&&(e.textContent=t[o])})}
async function getUserRegion(){try{const t=await fetch("https://ip-api.com/json/?fields=countryCode");if(!t.ok)throw new Error("Region detection failed");const e=await t.json();return e.countryCode||"US"}catch(t){return console.warn("Could not auto-detect region. Defaulting to 'US'.",t),"US"}}
function createProductCardHTML(t,e){let o=t.regionalPrices[userRegion]||t.regionalPrices.US;if(!o||0===o.length)return'<p>No pricing available for your region.</p>';o.sort((t,e)=>t.price-e.price);const n=Object.entries(t.specs).map(([t,e])=>`<li><span class="spec-label">${t}</span> <span>${e}</span></li>`).join(""),r=o.map(t=>`<div class="price-item"><span>${t.store}: <strong>${t.currency}${t.price}</strong></span><a href="${t.link}" target="_blank" class="buy-button">Buy</a></div>`).join("");return`<div class="product-card"><div class="product-header"><button class="remove-button" data-index="${e}">&times;</button><img src="${t.image}" alt="${t.name}"><h2>${t.name}</h2></div><ul class="spec-list">${n}</ul><div class="price-list">${r}</div></div>`}
function loadParticleBackground(){tsParticles.load("particles-js",{fpsLimit:60,interactivity:{events:{onHover:{enable:!0,mode:"repulse"},resize:!0},modes:{repulse:{distance:100,duration:.4}}},particles:{color:{value:"#555"},links:{color:"#555",distance:150,enable:!0,opacity:.2,width:1},collisions:{enable:!0},move:{direction:"none",enable:!0,outMode:"bounce",random:!1,speed:1,straight:!1},number:{density:{enable:!0,area:800},value:80},opacity:{value:.2},shape:{type:"circle"},size:{random:!0,value:3}},detectRetina:!0})};
function renderGrid(){comparisonGrid.innerHTML="",selectedProducts.forEach((t,e)=>{let o;o=t?createProductCardHTML(t,e):createPlaceholderCardHTML(e),comparisonGrid.innerHTML+=o}),addEventListenersToCards()};
function createPlaceholderCardHTML(t){return`<div class="placeholder-card" data-index="${t}"><span class="add-button">+ Compare</span></div>`};
function addEventListenersToCards(){document.querySelectorAll(".placeholder-card").forEach(t=>{t.addEventListener("click",()=>openModal(t.dataset.index))}),document.querySelectorAll(".remove-button").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation(),removeProduct(t.dataset.index)})})};
function openModal(t){activeSlotIndex=parseInt(t),populateModalList(),modal.style.display="flex",searchBar.focus()};
function closeModal(){modal.style.display="none",searchBar.value=""};
function populateModalList(t=""){productList.innerHTML="";const e=selectedProducts.filter(t=>t).map(t=>t.id),o=allEarbuds.filter(e=>e.name.toLowerCase().includes(t.toLowerCase()));o.forEach(t=>{const o=document.createElement("li"),n=e.includes(t.id);o.innerHTML=`<img src="${t.image}" alt=""> <span>${t.name}</span>`,n?o.classList.add("disabled"):o.addEventListener("click",()=>selectProduct(t.id)),productList.appendChild(o)})};
function selectProduct(t){const e=allEarbuds.find(e=>e.id===parseInt(t));selectedProducts[activeSlotIndex]=e,closeModal(),renderGrid()};
function removeProduct(t){selectedProducts[t]=null,renderGrid()};

// --- START THE APP ---
initializeApp();
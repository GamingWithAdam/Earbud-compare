// --- GLOBAL STATE & VARIABLES ---
let allEarbuds = []; 
let selectedProducts = [null, null];
let activeSlotIndex = null;
let userRegion = 'US'; // Default region
let userLanguage = 'en'; // Default language

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

// --- TRANSLATION DICTIONARY ---
const translations = {
    en: {
        settingsTitle: "Settings",
        countryLabel: "Country / Region",
        languageLabel: "Language",
        mainTitle: "Find Your Perfect Earbuds",
        subtitle: "Select up to two products below to compare specs and prices.",
        modalTitle: "Select an Earbud"
    },
    de: {
        settingsTitle: "Einstellungen",
        countryLabel: "Land / Region",
        languageLabel: "Sprache",
        mainTitle: "Finde deine perfekten Ohrhörer",
        subtitle: "Wähle bis zu zwei Produkte aus, um Daten und Preise zu vergleichen.",
        modalTitle: "Ohrhörer auswählen"
    }
};

// --- INITIALIZATION ---
async function initializeApp() {
    loadParticleBackground();
    setupEventListeners();
    try {
        // We still try to auto-detect, but the user can now override it.
        const detectedRegion = await getUserRegion();
        userRegion = detectedRegion;
        countrySelector.value = userRegion; // Set dropdown to detected region

        const response = await fetch('./earbuds.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        allEarbuds = await response.json();
        renderGrid();
        updateLanguage(); // Apply initial language
    } catch (error) {
        console.error("Could not initialize app:", error);
        comparisonGrid.innerHTML = `<p style="text-align: center; color: #ff4d4d;">Error: Could not load product data.</p>`;
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    menuToggleButton.addEventListener('click', () => {
        settingsMenu.classList.toggle('open');
    });

    countrySelector.addEventListener('change', (event) => {
        userRegion = event.target.value;
        console.log(`Region manually set to: ${userRegion}`);
        renderGrid(); // Re-render the product cards with new regional prices
    });

    languageSelector.addEventListener('change', (event) => {
        userLanguage = event.target.value;
        console.log(`Language manually set to: ${userLanguage}`);
        updateLanguage(); // Update all text on the page
    });

    closeModalButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    searchBar.addEventListener('input', (e) => populateModalList(e.target.value));
}

// --- CORE FUNCTIONS ---

function updateLanguage() {
    const langDict = translations[userLanguage] || translations.en;
    document.querySelectorAll('[data-lang]').forEach(element => {
        const key = element.getAttribute('data-lang');
        if (langDict[key]) {
            element.textContent = langDict[key];
        }
    });
}

async function getUserRegion() {
    try {
        const response = await fetch('https://ip-api.com/json/?fields=countryCode');
        if (!response.ok) throw new Error('Region detection failed');
        const data = await response.json();
        return data.countryCode || 'US';
    } catch (error) {
        console.warn("Could not auto-detect region. Defaulting to 'US'.", error);
        return 'US';
    }
}

function createProductCardHTML(product, index) {
    let regionalPrices = product.regionalPrices[userRegion] || product.regionalPrices['US'];
    if (!regionalPrices || regionalPrices.length === 0) {
        return `<p>No pricing available for your region.</p>`;
    }
    regionalPrices.sort((a, b) => a.price - b.price);
    const specsHTML = Object.entries(product.specs).map(([key, value]) => `<li><span class="spec-label">${key}</span> <span>${value}</span></li>`).join('');
    const pricesHTML = regionalPrices.map(p => `<div class="price-item"><span>${p.store}: <strong>${p.currency}${p.price}</strong></span><a href="${p.link}" target="_blank" class="buy-button">Buy</a></div>`).join('');
    return `<div class="product-card"><div class="product-header"><button class="remove-button" data-index="${index}">&times;</button><img src="${product.image}" alt="${product.name}"><h2>${product.name}</h2></div><ul class="spec-list">${specsHTML}</ul><div class="price-list">${pricesHTML}</div></div>`;
}

// All other functions remain mostly the same, just copied here for completeness.
function loadParticleBackground(){tsParticles.load("particles-js",{fpsLimit:60,interactivity:{events:{onHover:{enable:!0,mode:"repulse"},resize:!0},modes:{repulse:{distance:100,duration:.4}}},particles:{color:{value:"#555"},links:{color:"#555",distance:150,enable:!0,opacity:.2,width:1},collisions:{enable:!0},move:{direction:"none",enable:!0,outMode:"bounce",random:!1,speed:1,straight:!1},number:{density:{enable:!0,area:800},value:80},opacity:{value:.2},shape:{type:"circle"},size:{random:!0,value:3}},detectRetina:!0})};
function renderGrid(){comparisonGrid.innerHTML="",selectedProducts.forEach((e,t)=>{let o;o=e?createProductCardHTML(e,t):createPlaceholderCardHTML(t),comparisonGrid.innerHTML+=o}),addEventListenersToCards()};
function createPlaceholderCardHTML(e){return`<div class="placeholder-card" data-index="${e}"><span class="add-button">+ Compare</span></div>`};
function addEventListenersToCards(){document.querySelectorAll(".placeholder-card").forEach(e=>{e.addEventListener("click",()=>openModal(e.dataset.index))}),document.querySelectorAll(".remove-button").forEach(e=>{e.addEventListener("click",t=>{t.stopPropagation(),removeProduct(e.dataset.index)})})};
function openModal(e){activeSlotIndex=parseInt(e),populateModalList(),modal.style.display="flex",searchBar.focus()};
function closeModal(){modal.style.display="none",searchBar.value=""};
function populateModalList(e=""){productList.innerHTML="";const t=selectedProducts.filter(e=>e).map(e=>e.id),o=allEarbuds.filter(t=>t.name.toLowerCase().includes(e.toLowerCase()));o.forEach(e=>{const o=document.createElement("li"),n=t.includes(e.id);o.innerHTML=`<img src="${e.image}" alt=""> <span>${e.name}</span>`,n?o.classList.add("disabled"):o.addEventListener("click",()=>selectProduct(e.id)),productList.appendChild(o)})};
function selectProduct(e){const t=allEarbuds.find(t=>t.id===parseInt(e));selectedProducts[activeSlotIndex]=t,closeModal(),renderGrid()};
function removeProduct(e){selectedProducts[e]=null,renderGrid()};

// --- START THE APP ---
initializeApp();
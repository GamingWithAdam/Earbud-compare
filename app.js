// --- APPLICATION STATE & GLOBAL VARIABLES ---
let allEarbuds = []; 
let selectedProducts = [null, null];
let activeSlotIndex = null;
let userRegion = 'US'; // Default region if detection fails

// --- DOM ELEMENTS ---
const comparisonGrid = document.getElementById('comparison-grid');
const modal = document.getElementById('product-modal');
const closeModalButton = document.getElementById('close-modal');
const productList = document.getElementById('product-list');
const searchBar = document.getElementById('search-bar');

// --- ASYNCHRONOUS INITIALIZATION ---

/**
 * Main function to start the application.
 * It detects the user's region, then fetches product data, then renders the page.
 */
async function initializeApp() {
    loadParticleBackground();
    try {
        userRegion = await getUserRegion();
        console.log(`User region detected: ${userRegion}`);
        
        const response = await fetch('./earbuds.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        allEarbuds = await response.json();
        renderGrid(); 
    } catch (error) {
        console.error("Could not initialize app:", error);
        comparisonGrid.innerHTML = `<p style="text-align: center; color: #ff4d4d; font-size: 1.2rem;">Error: Could not load product data. Please try again later.</p>`;
    }
}

/**
 * Uses a free Geolocation API to detect the user's country code.
 * @returns {Promise<string>} The user's two-letter country code (e.g., 'US', 'GB').
 */
async function getUserRegion() {
    try {
        // We use ip-api.com which is free and requires no key for our use case.
        const response = await fetch('http://ip-api.com/json/?fields=countryCode');
        if (!response.ok) throw new Error('Region detection failed');
        const data = await response.json();
        // Return the country code (e.g., "US", "GB") or default to 'US'
        return data.countryCode || 'US'; 
    } catch (error) {
        console.warn("Could not detect user region. Defaulting to 'US'.", error);
        return 'US'; // Fallback to US if API fails
    }
}

// --- CORE RENDERING & LOGIC FUNCTIONS ---

/**
 * Creates HTML for a card showing a selected product.
 * THIS FUNCTION IS NOW REGION-AWARE.
 */
function createProductCardHTML(product, index) {
    // Get prices for the user's region, or fallback to US prices if the region is not available.
    let regionalPrices = product.regionalPrices[userRegion] || product.regionalPrices['US'];
    
    // If even US prices aren't available, show a message.
    if (!regionalPrices || regionalPrices.length === 0) {
        return `<p>No pricing information available for your region.</p>`;
    }

    // Sort prices from low to high
    regionalPrices.sort((a, b) => a.price - b.price);

    const specsHTML = Object.entries(product.specs).map(([key, value]) =>
        `<li><span class="spec-label">${key}</span> <span>${value}</span></li>`
    ).join('');
        
    const pricesHTML = regionalPrices.map(p => `
        <div class="price-item">
            <span>${p.store}: <strong>${p.currency}${p.price}</strong></span>
            <a href="${p.link}" target="_blank" class="buy-button">Buy</a>
        </div>
    `).join('');

    return `
        <div class="product-card">
            <div class="product-header">
                <button class="remove-button" data-index="${index}">&times;</button>
                <img src="${product.image}" alt="${product.name}">
                <h2>${product.name}</h2>
            </div>
            <ul class="spec-list">${specsHTML}</ul>
            <div class="price-list">${pricesHTML}</div>
        </div>
    `;
}


// --- UNCHANGED FUNCTIONS (You can copy these from your existing app.js) ---
function loadParticleBackground(){tsParticles.load("particles-js",{fpsLimit:60,interactivity:{events:{onHover:{enable:!0,mode:"repulse"},resize:!0},modes:{repulse:{distance:100,duration:.4}}},particles:{color:{value:"#555"},links:{color:"#555",distance:150,enable:!0,opacity:.2,width:1},collisions:{enable:!0},move:{direction:"none",enable:!0,outMode:"bounce",random:!1,speed:1,straight:!1},number:{density:{enable:!0,area:800},value:80},opacity:{value:.2},shape:{type:"circle"},size:{random:!0,value:3}},detectRetina:!0})};
function renderGrid(){comparisonGrid.innerHTML="",selectedProducts.forEach((e,t)=>{let o;o=e?createProductCardHTML(e,t):createPlaceholderCardHTML(t),comparisonGrid.innerHTML+=o}),addEventListenersToCards()};
function createPlaceholderCardHTML(e){return`\n        <div class="placeholder-card" data-index="${e}">\n            <span class="add-button">+ Compare</span>\n        </div>\n    `};
function addEventListenersToCards(){document.querySelectorAll(".placeholder-card").forEach(e=>{e.addEventListener("click",()=>openModal(e.dataset.index))}),document.querySelectorAll(".remove-button").forEach(e=>{e.addEventListener("click",t=>{t.stopPropagation(),removeProduct(e.dataset.index)})})};
function openModal(e){activeSlotIndex=parseInt(e),populateModalList(),modal.style.display="flex",searchBar.focus()};
function closeModal(){modal.style.display="none",searchBar.value=""};
function populateModalList(e=""){productList.innerHTML="";const t=selectedProducts.filter(e=>e).map(e=>e.id),o=allEarbuds.filter(t=>t.name.toLowerCase().includes(e.toLowerCase()));o.forEach(e=>{const o=document.createElement("li"),n=t.includes(e.id);o.innerHTML=`<img src="${e.image}" alt=""> <span>${e.name}</span>`,n?o.classList.add("disabled"):o.addEventListener("click",()=>selectProduct(e.id)),productList.appendChild(o)})};
function selectProduct(e){const t=allEarbuds.find(t=>t.id===parseInt(e));selectedProducts[activeSlotIndex]=t,closeModal(),renderGrid()};
function removeProduct(e){selectedProducts[e]=null,renderGrid()};
closeModalButton.addEventListener("click",closeModal),modal.addEventListener("click",e=>{e.target===modal&&closeModal()}),searchBar.addEventListener("input",e=>populateModalList(e.target.value));


// Start the application!
initializeApp();
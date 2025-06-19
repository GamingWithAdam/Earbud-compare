// --- APPLICATION STATE & GLOBAL VARIABLES ---
let allEarbuds = []; // This will hold all our data once loaded from the JSON file
let selectedProducts = [null, null];
let activeSlotIndex = null;

// --- DOM ELEMENTS ---
const comparisonGrid = document.getElementById('comparison-grid');
const modal = document.getElementById('product-modal');
const closeModalButton = document.getElementById('close-modal');
const productList = document.getElementById('product-list');
const searchBar = document.getElementById('search-bar');

// --- ASYNCHRONOUS DATA LOADING ---

/**
 * Fetches the earbud data from our JSON file and then starts the application.
 * This is the new starting point of our app.
 */
async function initializeApp() {
    try {
        const response = await fetch('./earbuds.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allEarbuds = await response.json();
        // Once data is loaded successfully, render the initial empty grid.
        renderGrid(); 
    } catch (error) {
        console.error("Could not load earbud data:", error);
        comparisonGrid.innerHTML = `<p style="text-align: center; color: red;">Error: Could not load product data. Please try again later.</p>`;
    }
}


// --- FUNCTIONS (Mostly the same as before, but using `allEarbuds` variable) ---

/** Renders the entire comparison grid based on the current state */
function renderGrid() {
    comparisonGrid.innerHTML = ''; // Clear the grid
    selectedProducts.forEach((product, index) => {
        let cardHTML;
        if (product) {
            cardHTML = createProductCardHTML(product, index);
        } else {
            cardHTML = createPlaceholderCardHTML(index);
        }
        comparisonGrid.innerHTML += cardHTML;
    });
    addEventListenersToCards();
}

/** Creates HTML for a card showing a selected product */
function createProductCardHTML(product, index) {
    product.prices.sort((a, b) => a.price - b.price);
    const specsHTML = Object.entries(product.specs).map(([key, value]) =>
        `<li><span class="spec-label">${key}:</span> <span>${value}</span></li>`
    ).join('');
    const pricesHTML = product.prices.map(p => `
        <div class="price-item">
            <span>${p.store}: <strong>$${p.price}</strong></span>
            <a href="${p.link}" target="_blank" class="buy-button">Buy</a>
        </div>
    `).join('');

    return `
        <div class="product-card">
            <div class="product-header">
                <button class="remove-button" data-index="${index}">×</button>
                <img src="${product.image}" alt="${product.name}">
                <h2>${product.name}</h2>
            </div>
            <ul class="spec-list">${specsHTML}</ul>
            <div class="price-list">${pricesHTML}</div>
        </div>
    `;
}

/** Creates HTML for an empty placeholder card */
function createPlaceholderCardHTML(index) {
    return `
        <div class="placeholder-card" data-index="${index}">
            <span class="add-button">+ Add Earbud</span>
        </div>
    `;
}

/** Attaches click listeners to the newly rendered cards */
function addEventListenersToCards() {
    document.querySelectorAll('.placeholder-card').forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset.index));
    });
    document.querySelectorAll('.remove-button').forEach(button => {
        button.addEventListener('click', () => removeProduct(button.dataset.index));
    });
}

/** Opens the product selection modal */
function openModal(index) {
    activeSlotIndex = parseInt(index);
    populateModalList();
    modal.style.display = 'flex';
    searchBar.focus();
}

/** Closes the product selection modal */
function closeModal() {
    modal.style.display = 'none';
    searchBar.value = '';
}

/** Fills the modal list with products, filtering by search term */
function populateModalList(searchTerm = '') {
    productList.innerHTML = '';
    const selectedIds = selectedProducts.filter(p => p).map(p => p.id);
    const filteredData = allEarbuds.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredData.forEach(product => {
        const li = document.createElement('li');
        const isSelected = selectedIds.includes(product.id);
        li.innerHTML = `<img src="${product.image}" alt=""> <span>${product.name}</span>`;
        li.dataset.productId = product.id;

        if (isSelected) {
            li.classList.add('disabled');
        } else {
            li.addEventListener('click', () => selectProduct(product.id));
        }
        productList.appendChild(li);
    });
}

/** Handles selecting a product from the modal */
function selectProduct(productId) {
    const product = allEarbuds.find(p => p.id === parseInt(productId));
    selectedProducts[activeSlotIndex] = product;
    closeModal();
    renderGrid();
}

/** Handles removing a product from a slot */
function removeProduct(index) {
    selectedProducts[index] = null;
    renderGrid();
}

// --- EVENT LISTENERS & INITIALIZATION ---
closeModalButton.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
searchBar.addEventListener('input', (e) => populateModalList(e.target.value));

// Start the application by loading the data.
initializeApp();

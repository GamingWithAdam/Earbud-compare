// --- DATABASE ---
// In a real app, this would be fetched from your server (e.g., fetch('/api/products'))
const earbudsData = [
    { id: 1, name: "AirPods Pro 2", image: "https://i.imgur.com/G20gD9y.png", specs: { "Noise Cancellation": "Excellent", "Battery (Buds)": "6 hours", "Water Resistance": "IPX4" }, prices: [ { store: "Amazon", price: 249, link: "#YOUR_AFFILIATE_LINK" }, { store: "Best Buy", price: 249, link: "#YOUR_AFFILIATE_LINK" } ] },
    { id: 2, name: "Sony WF-1000XM5", image: "https://i.imgur.com/EDVot5S.png", specs: { "Noise Cancellation": "Best-in-class", "Battery (Buds)": "8 hours", "Water Resistance": "IPX4" }, prices: [ { store: "Amazon", price: 299, link: "#YOUR_AFFILIATE_LINK" }, { store: "B&H", price: 298, link: "#YOUR_AFFILIATE_LINK" } ] },
    { id: 3, name: "Bose QuietComfort II", image: "https://i.imgur.com/UfJ4wT0.png", specs: { "Noise Cancellation": "Top-Tier", "Battery (Buds)": "6 hours", "Water Resistance": "IPX4" }, prices: [ { store: "Amazon", price: 279, link: "#YOUR_AFFILIATE_LINK" }, { store: "Bose", price: 279, link: "#YOUR_AFFILIATE_LINK" } ] },
    { id: 4, name: "Sennheiser Momentum 3", image: "https://i.imgur.com/5uR3T3r.png", specs: { "Noise Cancellation": "Very Good", "Battery (Buds)": "7 hours", "Water Resistance": "IPX4" }, prices: [ { store: "Amazon", price: 245, link: "#YOUR_AFFILIATE_LINK" }, { store: "Walmart", price: 250, link: "#YOUR_AFFILIATE_LINK" } ] },
    { id: 5, name: "Anker Soundcore A40", image: "https://i.imgur.com/7YfEwql.png", specs: { "Noise Cancellation": "Good", "Battery (Buds)": "10 hours", "Water Resistance": "IPX4" }, prices: [ { store: "Amazon", price: 79, link: "#YOUR_AFFILIATE_LINK" }, { store: "Anker", price: 99, link: "#YOUR_AFFILIATE_LINK" } ] }
];

// --- APPLICATION STATE ---
// This array holds the products being compared. null means the slot is empty.
let selectedProducts = [null, null]; 
let activeSlotIndex = null; // To remember which slot we are filling

// --- DOM ELEMENTS ---
const comparisonGrid = document.getElementById('comparison-grid');
const modal = document.getElementById('product-modal');
const closeModalButton = document.getElementById('close-modal');
const productList = document.getElementById('product-list');
const searchBar = document.getElementById('search-bar');

// --- FUNCTIONS ---

/** Renders the entire comparison grid based on the current state */
function renderGrid() {
    comparisonGrid.innerHTML = ''; // Clear the grid
    selectedProducts.forEach((product, index) => {
        let cardHTML;
        if (product) {
            // If a product is selected, render the product card
            cardHTML = createProductCardHTML(product, index);
        } else {
            // If the slot is empty, render the placeholder card
            cardHTML = createPlaceholderCardHTML(index);
        }
        comparisonGrid.innerHTML += cardHTML;
    });
    addEventListenersToCards();
}

/** Creates HTML for a card showing a selected product */
function createProductCardHTML(product, index) {
    product.prices.sort((a, b) => a.price - b.price); // Sort prices
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
                <button class="remove-button" data-index="${index}">&times;</button>
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
    populateModalList(); // Populate with all products initially
    modal.style.display = 'flex';
    searchBar.focus();
}

/** Closes the product selection modal */
function closeModal() {
    modal.style.display = 'none';
    searchBar.value = ''; // Reset search bar
}

/** Fills the modal list with products, filtering by search term */
function populateModalList(searchTerm = '') {
    productList.innerHTML = '';
    const selectedIds = selectedProducts.filter(p => p).map(p => p.id);
    const filteredData = earbudsData.filter(p => 
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
    const product = earbudsData.find(p => p.id === parseInt(productId));
    selectedProducts[activeSlotIndex] = product;
    closeModal();
    renderGrid();
}

/** Handles removing a product from a slot */
function removeProduct(index) {
    selectedProducts[index] = null;
    renderGrid();
}

// --- INITIALIZATION ---
closeModalButton.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { // Close if clicking on the overlay
    if (e.target === modal) closeModal();
});
searchBar.addEventListener('input', (e) => populateModalList(e.target.value));

renderGrid(); // Initial render of the page
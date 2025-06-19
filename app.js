// --- APPLICATION STATE & GLOBAL VARIABLES ---
let allEarbuds = []; 
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
 * Fetches data, initializes the particle background, and starts the app.
 */
async function initializeApp() {
    // Start the particle background immediately
    loadParticleBackground();

    try {
        const response = await fetch('./earbuds.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allEarbuds = await response.json();
        // Once data is loaded, render the initial empty grid.
        renderGrid(); 
    } catch (error) {
        console.error("Could not load earbud data:", error);
        comparisonGrid.innerHTML = `<p style="text-align: center; color: #ff4d4d; font-size: 1.2rem;">Error: Could not load product data. Please try again later.</p>`;
    }
}

/**
 * Loads and configures the tsParticles background effect.
 */
function loadParticleBackground() {
    tsParticles.load("particles-js", {
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    mode: "repulse",
                },
                resize: true,
            },
            modes: {
                repulse: {
                    distance: 100,
                    duration: 0.4,
                },
            },
        },
        particles: {
            color: {
                value: "#555",
            },
            links: {
                color: "#555",
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
            },
            collisions: {
                enable: true,
            },
            move: {
                direction: "none",
                enable: true,
                outMode: "bounce",
                random: false,
                speed: 1,
                straight: false,
            },
            number: {
                density: {
                    enable: true,
                    area: 800,
                },
                value: 80,
            },
            opacity: {
                value: 0.2,
            },
            shape: {
                type: "circle",
            },
            size: {
                random: true,
                value: 3,
            },
        },
        detectRetina: true,
    });
}

// --- CORE RENDERING & LOGIC FUNCTIONS (Unchanged from before) ---

function renderGrid() {
    comparisonGrid.innerHTML = '';
    selectedProducts.forEach((product, index) => {
        let cardHTML = product ? createProductCardHTML(product, index) : createPlaceholderCardHTML(index);
        comparisonGrid.innerHTML += cardHTML;
    });
    addEventListenersToCards();
}

function createProductCardHTML(product, index) {
    product.prices.sort((a, b) => a.price - b.price);
    const specsHTML = Object.entries(product.specs).map(([key, value]) =>
        `<li><span class="spec-label">${key}</span> <span>${value}</span></li>`
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

function createPlaceholderCardHTML(index) {
    return `
        <div class="placeholder-card" data-index="${index}">
            <span class="add-button">+ Compare</span>
        </div>
    `;
}

function addEventListenersToCards() {
    document.querySelectorAll('.placeholder-card').forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset.index));
    });
    document.querySelectorAll('.remove-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents card click event from firing
            removeProduct(button.dataset.index);
        });
    });
}

function openModal(index) {
    activeSlotIndex = parseInt(index);
    populateModalList();
    modal.style.display = 'flex';
    searchBar.focus();
}

function closeModal() {
    modal.style.display = 'none';
    searchBar.value = '';
}

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
        if (isSelected) {
            li.classList.add('disabled');
        } else {
            li.addEventListener('click', () => selectProduct(product.id));
        }
        productList.appendChild(li);
    });
}

function selectProduct(productId) {
    const product = allEarbuds.find(p => p.id === parseInt(productId));
    selectedProducts[activeSlotIndex] = product;
    closeModal();
    renderGrid();
}

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

// Start the application.
initializeApp();
import { supabase } from './utils/supabase.js';

// Global state tracking for user actions
let productsData = [];
let selectedSizes = {};

// Fetch entire catalog combined with sizing variants directly from Supabase
async function fetchCatalog() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, title, price, original_price, fabric, style_type, primary_image_url,
      product_variants ( size_code, is_in_stock )
    `)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching data from Supabase:', error);
    document.getElementById('productGrid').innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load items. Check your API details.</p>`;
    return;
  }

  productsData = data;
  renderGrid(productsData);
}

// Render dynamic HTML cards into our grid template
function renderGrid(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-12">No matching outfits found.</p>`;
    return;
  }

  grid.innerHTML = products.map(product => {
    // Generate individual size action boxes safely
    const sizeButtons = product.product_variants && product.product_variants.length > 0
      ? product.product_variants.map(variant => {
          if (variant.is_in_stock) {
            return `<button type="button" data-product="${product.id}" data-size="${variant.size_code}" class="size-btn border border-gray-300 text-xs font-bold rounded px-2.5 py-1 text-gray-700 hover:border-pink-500 transition-colors">${variant.size_code}</button>`;
          } else {
            return `<button type="button" disabled class="border border-gray-100 text-xs font-normal rounded px-2.5 py-1 bg-gray-100 text-gray-300 cursor-not-allowed">${variant.size_code}</button>`;
          }
        }).join('')
      : `<span class="text-xs text-amber-600 font-medium">Free Size</span>`;

    // Calculate dynamic discount percentage values if original price exists
    const discountBadge = product.original_price 
      ? `<span class="absolute top-2 left-2 bg-pink-600 text-white font-bold text-xs px-2 py-0.5 rounded-full shadow-xs">-${Math.round(((product.original_price - product.price) / product.original_price) * 100)}% Off</span>`
      : '';

    return `
      <div class="bg-white rounded-2xl overflow-hidden border border-pink-100/40 shadow-xs hover:shadow-md transition-shadow relative flex flex-col justify-between">
        ${discountBadge}
        <img src="${product.primary_image_url}" alt="${product.title}" class="w-full h-72 object-cover object-top">
        
        <div class="p-4 flex-grow flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-gray-800 text-base line-clamp-1 mb-1">${product.title}</h3>
            <p class="text-xs text-gray-400 mb-2 font-medium">${product.style_type} • ${product.fabric}</p>
            
            <div class="flex items-baseline gap-2 mb-4">
              <span class="text-xl font-extrabold text-pink-600">₹${product.price}</span>
              ${product.original_price ? `<span class="text-xs text-gray-400 line-through">₹${product.original_price}</span>` : ''}
            </div>
          </div>

          <div>
            <div class="mb-4">
              <p class="text-xs font-semibold text-gray-500 mb-1.5">Select Size:</p>
              <div class="flex flex-wrap gap-1.5">${sizeButtons}</div>
            </div>

            <button type="button" data-order-id="${product.id}" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-xs">
              💬 Order via WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  setupEventListeners();
}

// Track visual styling changes when sizes are toggled and clicked
function setupEventListeners() {
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.currentTarget.getAttribute('data-product');
      const size = e.currentTarget.getAttribute('data-size');
      
      selectedSizes[productId] = size;

      // Clear previous selection indicators inside this product's scope
      document.querySelectorAll(`.size-btn[data-product="${productId}"]`).forEach(b => b.classList.remove('selected'));
      e.currentTarget.classList.add('selected');
    });
  });

  // Intercept checkout triggers
  document.querySelectorAll('[data-order-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-order-id');
      sendOrder(id);
    });
  });
}

// Forward direct custom orders right to WhatsApp link endpoints
function sendOrder(productId) {
  const product = productsData.find(p => p.id === productId);
  const size = selectedSizes[productId];

  // If items have variants available but none were selected, throw an alert prompt
  if (product.product_variants && product.product_variants.length > 0 && !size) {
    alert('Please select a size first before ordering! 📏');
    return;
  }

  const phone = "917737515169"; // Put your actual business mobile number here
  const text = `Hello Payal Collection, I would like to order this item:\n\n` +
               `👗 *Design:* ${product.title}\n` +
               `🧵 *Fabric:* ${product.fabric}\n` +
               `📏 *Size Ordered:* ${size || 'Standard'}\n` +
               `💰 *Price:* ₹${product.price}\n\n` +
               `Please let me know if this is available! Thanks.`;

  window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank');
}

// Apply reactive filtering controls inside options panel
function applyFilters() {
  const fabricFilter = document.getElementById('fabricFilter');
  const styleFilter = document.getElementById('styleFilter');

  if (!fabricFilter || !styleFilter) return;

  const fabricVal = fabricFilter.value;
  const styleVal = styleFilter.value;

  const filtered = productsData.filter(p => {
    const matchesFabric = fabricVal === 'all' || p.fabric === fabricVal;
    const matchesStyle = styleVal === 'all' || p.style_type === styleVal;
    return matchesFabric && matchesStyle;
  });

  renderGrid(filtered);
}

// Initialize Dropdown Listeners safely if they exist in HTML
const fabricFilterEl = document.getElementById('fabricFilter');
const styleFilterEl = document.getElementById('styleFilter');

if (fabricFilterEl) fabricFilterEl.addEventListener('change', applyFilters);
if (styleFilterEl) styleFilterEl.addEventListener('change', applyFilters);

// Initialize system loop
fetchCatalog();

// Register Service Worker for PWA compliance
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker successfully registered! ✅', reg.scope))
      .catch(err => console.error('Service Worker registration failed ❌', err));
  });
}
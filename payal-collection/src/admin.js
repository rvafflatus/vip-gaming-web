import { supabase } from './utils/supabase.js';

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Uploading photo and saving details...';

  // Extract Form Inputs
  const title = document.getElementById('title').value;
  const price = parseFloat(document.getElementById('price').value);
  const originalPrice = document.getElementById('originalPrice').value ? parseFloat(document.getElementById('originalPrice').value) : null;
  const fabric = document.getElementById('fabric').value;
  const styleType = document.getElementById('styleType').value;
  const imageFile = document.getElementById('imageFile').files[0]; // Grab the raw uploaded file
  
  // Clean text patterns to generate matching URL Safe Slugs
  const randomId = Math.floor(Math.random() * 1000);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + randomId;

  let finalImageUrl = '';

  // 1. Upload the image file to the Supabase Storage Bucket
  if (imageFile) {
    // Generate a unique file name using the slug and the file's native extension
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `${slug}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('product-images')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      alert('❌ Image Upload Failed: ' + uploadError.message);
      submitBtn.disabled = false;
      submitBtn.innerText = '✨ Upload New Design to Catalog';
      return;
    }

    // Get the clean Public URL for the uploaded file
    const { data: publicUrlData } = supabase
      .storage
      .from('product-images')
      .getPublicUrl(fileName);

    finalImageUrl = publicUrlData.publicUrl;
  }

  // 2. Write core item data to 'products' table using the newly generated storage URL
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert([{
      title: title,
      slug: slug,
      price: price,
      original_price: originalPrice,
      fabric: fabric,
      style_type: styleType,
      primary_image_url: finalImageUrl, // Saved direct storage bucket path
      is_active: true
    }])
    .select()
    .single();

  if (productError) {
    alert('❌ Product Metadata Save Failed: ' + productError.message);
    submitBtn.disabled = false;
    submitBtn.innerText = '✨ Upload New Design to Catalog';
    return;
  }

  // 3. Extract selected checkbox size attributes
  const selectedSizes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

  if (selectedSizes.length > 0) {
    const variantRows = selectedSizes.map(size => ({
      product_id: product.id,
      size_code: size,
      is_in_stock: true
    }));

    const { error: variantError } = await supabase
      .from('product_variants')
      .insert(variantRows);

    if (variantError) {
      alert('⚠️ Product saved, but Size Variant Mapping failed: ' + variantError.message);
    }
  }

  alert('✅ Design successfully published with your photo uploaded live!');
  document.getElementById('productForm').reset();
  submitBtn.disabled = false;
  submitBtn.innerText = '✨ Upload New Design to Catalog';
});
// --- CATALOG MANAGEMENT LOGIC (FETCH, EDIT, DELETE) ---

// 1. Fetch and render items instantly when the page open up
async function loadAdminCatalog() {
  const grid = document.getElementById('adminProductGrid');
  grid.innerHTML = '<p class="text-gray-400 text-sm col-span-full text-center">Loading current catalog items...</p>';

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    grid.innerHTML = `<p class="text-red-500 text-sm col-span-full">Error loading items: ${error.message}</p>`;
    return;
  }

  if (products.length === 0) {
    grid.innerHTML = '<p class="text-gray-400 text-sm col-span-full text-center">No catalog items found yet.</p>';
    return;
  }

  grid.innerHTML = ''; // Clear status message
  
  products.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm";
    card.innerHTML = `
      <div>
        <img src="${item.primary_image_url || 'https://via.placeholder.com/150'}" class="w-full h-40 object-cover rounded-xl mb-3 border border-gray-200">
        <h4 class="font-bold text-gray-800 text-sm truncate">${item.title}</h4>
        <p class="text-pink-600 font-extrabold text-sm mt-1">₹${item.price}</p>
      </div>
      <div class="flex gap-2 mt-4">
        <button onclick="openEditModal('${item.id}', '${item.title.replace(/'/g, "\\'")}', ${item.price})" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 px-3 rounded-xl text-xs transition">
          ✏️ Edit
        </button>
        <button onclick="deleteProduct('${item.id}')" class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1.5 px-3 rounded-xl text-xs transition">
          🗑️ Delete
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// 2. Delete Process Function
window.deleteProduct = async (id) => {
  if (!confirm("Are you absolutely sure you want to completely remove this listing from your store?")) return;

  // Delete product row (Cascade deletes sizes if your DB foreign keys match, or just deletes main item row)
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    alert("❌ Delete action failed: " + error.message);
  } else {
    alert("🗑️ Listing removed successfully!");
    loadAdminCatalog(); // Refresh current display items
  }
};

// 3. Modal Controls
window.openEditModal = (id, title, price) => {
  document.getElementById('editProductId').value = id;
  document.getElementById('editTitle').value = title;
  document.getElementById('editPrice').value = price;
  document.getElementById('editModal').classList.remove('hidden');
};

window.closeEditModal = () => {
  document.getElementById('editModal').classList.add('hidden');
};

// 4. Handle Edit Submission Modifications
document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editProductId').value;
  const newTitle = document.getElementById('editTitle').value;
  const newPrice = parseFloat(document.getElementById('editPrice').value);

  const { error } = await supabase
    .from('products')
    .update({ title: newTitle, price: newPrice })
    .eq('id', id);

  if (error) {
    alert("❌ Failed to update item details: " + error.message);
  } else {
    alert("✅ Listing modifications saved successfully!");
    closeEditModal();
    loadAdminCatalog(); // Refresh database grid list view
  }
});

// Run automatically on page execution load
loadAdminCatalog();
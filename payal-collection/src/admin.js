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
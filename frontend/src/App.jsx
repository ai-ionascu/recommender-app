import { useState, useEffect } from 'react'
import axios from 'axios'
import ImageUploader from './components/ImageUploader';
import './App.css';
import { validateProductData, normalize } from '@your-org/common';


const API_URL = process.env.NODE_ENV === 'production' 
  ? "http://localhost:3000/api/products" 
  : "http://localhost:3001/products";

const VITE_CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL;
const VITE_CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

function App() {
  const [products, setProducts] = useState([])
  const [formData, setFormData] = useState({
    // Common fields
    name: '',
    price: '',
    category: '',
    country: '',
    region: '',
    description: '',
    highlight: '',
    stock: '',
    featured: false,

    //drinks specific
    alcohol_content: '',
    volume_ml: '',
    
    // Wine-specific
    wine_type: '',
    grape_variety: '',
    vintage: '',
    appellation: '',
    serving_temperature: '',

    // Spirits
    spirit_type: '',
    age_statement: '',
    distillation_year: '',
    cask_type: '',

    // Beer
    style: '',
    ibu: '',
    fermentation_type: '',
    brewery: '',

    // Accessories
    accessory_type: '',
    material: '',
    compatible_with_product_type: ''
  })

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [generationError, setGenerationError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(API_URL);
        console.log('API Response:', response.data);
        setProducts(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    }
    fetchProducts()
  }, [])

  const prepareImagePayload = async (images) => {
    
    const result = [];

    if (!images || images.length === 0) {
      return result;
    }

    for (const img of images) {
      if (img.rawFile instanceof File) {
        // upload local file to Cloudinary
        const formData = new FormData();
        formData.append('file', img.rawFile);
        formData.append('upload_preset', VITE_CLOUDINARY_UPLOAD_PRESET);
        console.log("UPLOAD_URL:", VITE_CLOUDINARY_UPLOAD_URL);
        console.log("UPLOAD_PRESET:", VITE_CLOUDINARY_UPLOAD_PRESET);

        try {
          const uploadRes = await axios.post(VITE_CLOUDINARY_UPLOAD_URL, formData);
          result.push({
            url: uploadRes.data.secure_url,
            alt_text: img.alt_text || '',
            is_main: img.is_main === true,
          });
        } catch (err) {
          console.error('Cloudinary upload error:', err);
          throw new Error('Failed to upload local image');
        }
      } else {
        // forward existing external image (to be uploaded in backend)
        result.push({
          url: img.url,
          alt_text: img.alt_text || '',
          is_main: img.is_main === true
        });
      }
    }

    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const errors = validateProductData(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    console.log("productImages:", productImages);

    if (productImages.length > 3) {
      setErrorMessage("You can associate at most 3 images per product.");
      return;
    }

    try {

      const images = (await prepareImagePayload(productImages)).filter(img => img && img.url);
      console.log("Prepared images:", images);
      // Final validation: main image must be exactly one if any images
      if (images.length > 0) {
        const mainCount = images.filter(img => img.is_main).length;
        if (mainCount === 0) {
          images[0].is_main = true;
        } else if (mainCount > 1) {
          setErrorMessage("Exactly one image must be marked as main.");
          return;
        }
      }

      const payload = {
        ...formData,
        images,
        ...(formData.category === 'accessories' && {
          alcohol_content: undefined,
          volume_ml: undefined,
        }),
      };

      let response;
      if (editingId) {
        response = await axios.put(`${API_URL}/${editingId}`, {
          ...payload,
          details: getCategoryDetails(),
        });
        setSuccessMessage('The product has been successfully updated.');
      } else {
        response = await axios.post(API_URL, payload, {
          headers: { 'Content-Type': 'application/json' },
        });
        setSuccessMessage('The product has been successfully added.');
      }

      // reload
      const newProducts = await axios.get(API_URL);
      setProducts(newProducts.data);

      // reset
      setEditingId(null);
      setProductImages([]);
      setFormData(prev => ({
        ...initializeFormData(prev.category),
        category: prev.category,
      }));

      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error) {
      if (error.response?.status === 400 && error.response.data.errors) {
        setFieldErrors(error.response.data.errors);
      } else {
        console.error('Error saving product:', error);
        setErrorMessage(error.response?.data?.error || error.message);
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  };

  const getCategoryDetails = () => {
    switch(formData.category) {
      case 'wine':
        return {
          wine_type: formData.wine_type,
          grape_variety: formData.grape_variety,
          vintage: formData.vintage,
          appellation: formData.appellation,
          serving_temperature: formData.serving_temperature
        }
      case 'spirits':
        return {
          spirit_type: formData.spirit_type,
          age_statement: formData.age_statement,
          distillation_year: formData.distillation_year,
          cask_type: formData.cask_type
        }
      case 'beer':
        return {
          style: formData.style,
          ibu: formData.ibu,
          fermentation_type: formData.fermentation_type,
          brewery: formData.brewery
        }
      case 'accessories':
        return {
          accessory_type: formData.accessory_type,
          material: formData.material,
          compatible_with_product_type: formData.compatible_with_product_type
        }
      default:
        return {}
    }
  }

  const handleEdit = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      const product = response.data;
      
      setProductImages(product.images || []);
      setFormData({
        ...product,
        ...(product.details || {})
      });
      
      setEditingId(id);
      setShowEditForm(true);
      window.scrollTo(0, 0);
      
    } catch (error) {
      console.error('Error fetching product:', error);
      setErrorMessage('Error loading product for editing');
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null);
    setProductImages([]);
    setShowEditForm(false);
    setFormData(initializeFormData('wine'));
  }

  const handleDelete = async (id) => {
    try {
      if (window.confirm('Stergere produs?')) {
        await axios.delete(`${API_URL}/${id}`)
        setProducts(products.filter(product => product.id !== id))
        setSuccessMessage('Produsul a fost sters cu succes.')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      setErrorMessage('Nu am putut sterge produsul')
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  const initializeFormData = (category) => ({
    // Common fields
    name: '',
    price: '',
    country: '',
    region: '',
    description: '',
    highlight: '',
    stock: '',
    featured: false,
    
    // Category-specific defaults
    ...(category === 'wine' && {
      wine_type: '',
      grape_variety: '',
      alcohol_content: '',
      volume_ml: '',
      vintage: '',
      appellation: '',
      serving_temperature: ''
    }),
    ...(category === 'spirits' && {
      spirit_type: '',
      age_statement: '',
      distillation_year: '',
      alcohol_content: '',
      volume_ml: '',
      cask_type: ''
    }),
    ...(category === 'beer' && {
      style: '',
      ibu: '',
      fermentation_type: '',
      brewery: '',
      alcohol_content: '',
      volume_ml: '',
    }),
    ...(category === 'accessories' && {
      accessory_type: '',
      material: '',
      compatible_with_product_type: ''
    })
  })

  const renderDynamicFields = () => {
    switch(formData.category) {
      case 'wine':
        return (
          <>
            <div className="col-span-2 border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">Wine Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Alcohol Content (%)"
                  value={formData.alcohol_content}
                  onChange={e => setFormData({...formData, alcohol_content: e.target.value})}
                  className={fieldErrors.alcohol_content ? 'input-error' : 'p-2 border rounded'}
                  step="0.1"
                />
                <input
                  type="number"
                  placeholder="Volume (ml)"
                  value={formData.volume_ml}
                  onChange={e => setFormData({...formData, volume_ml: e.target.value})}
                  className={fieldErrors.volume_ml ? 'input-error' : 'p-2 border rounded'}
                />
                <select
                  value={formData.wine_type}
                  onChange={e => setFormData({...formData, wine_type: e.target.value})}
                  className={fieldErrors.wine_type ? 'input-error' : 'p-2 border rounded'}
                >
                  <option value="">-- Select wine type --</option>
                  <option value="red">Red</option>
                  <option value="white">White</option>
                  <option value="rose">Rosé</option>
                  <option value="sparkling">Sparkling</option>
                  <option value="dessert">Dessert</option>
                </select>
                <input
                  type="text"
                  placeholder="Grape Variety"
                  value={formData.grape_variety}
                  onChange={e => setFormData({...formData, grape_variety: e.target.value})}
                  className={fieldErrors.grape_variety ? 'input-error' : 'p-2 border rounded'}
                />
                <input
                  type="number"
                  placeholder="Vintage Year"
                  value={formData.vintage}
                  onChange={e => setFormData({...formData, vintage: e.target.value})}
                  className={fieldErrors.vintage ? 'input-error' : 'p-2 border rounded'}
                  min="1900"
                  max={new Date().getFullYear()}
                />
                <input
                  type="text"
                  placeholder="Appellation"
                  value={formData.appellation}
                  onChange={e => setFormData({...formData, appellation: e.target.value})}
                  className="p-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Serving Temperature (°C)"
                  value={formData.serving_temperature}
                  onChange={e => setFormData({...formData, serving_temperature: e.target.value})}
                  className="p-2 border rounded"
                  step="0.1"
                />
              </div>
            </div>
          </>
        )

      case 'spirits':
        return (
          <div className="col-span-2 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Spirit Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.spirit_type}
                onChange={e => setFormData({...formData, spirit_type: e.target.value})}
                className={fieldErrors.spirit_type ? 'input-error' : 'p-2 border rounded'}
              >
                <option value="">-- Select spirit type --</option>
                <option value="whiskey">Whiskey</option>
                <option value="vodka">Vodka</option>
                <option value="rhum">rhum</option>
                <option value="gin">Gin</option>
                <option value="tequila">Tequila</option>
              </select>
              <input
                type="text"
                placeholder="Age Statement"
                value={formData.age_statement}
                onChange={e => setFormData({...formData, age_statement: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="number"
                placeholder="Distillation Year"
                value={formData.distillation_year}
                onChange={e => setFormData({...formData, distillation_year: e.target.value})}
                className={fieldErrors.distillation_year ? 'input-error' : 'p-2 border rounded'}
                min="1900"
              />
              <input
                type="text"
                placeholder="Cask Type"
                value={formData.cask_type}
                onChange={e => setFormData({...formData, cask_type: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                  type="number"
                  placeholder="Alcohol Content (%)"
                  value={formData.alcohol_content}
                  onChange={e => setFormData({...formData, alcohol_content: e.target.value})}
                  className={fieldErrors.alcohol_content ? 'input-error' : 'p-2 border rounded'}
                  step="0.1"
                />
                <input
                  type="number"
                  placeholder="Volume (ml)"
                  value={formData.volume_ml}
                  onChange={e => setFormData({...formData, volume_ml: e.target.value})}
                  className={fieldErrors.volume_ml ? 'input-error' : 'p-2 border rounded'}
                />
            </div>
          </div>
        )

      case 'beer':
        return (
          <div className="col-span-2 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Beer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.style}
                onChange={e => setFormData({...formData, style: e.target.value})}
                className={fieldErrors.style ? 'input-error' : 'p-2 border rounded'}
              >
                <option value="">Select Style</option>
                <option value="ipa">IPA</option>
                <option value="stout">Stout</option>
                <option value="lager">Lager</option>
                <option value="pilsner">Pilsner</option>
                <option value="wheat">Wheat</option>
              </select>
              <input
                type="number"
                placeholder="IBU"
                value={formData.ibu}
                onChange={e => setFormData({...formData, ibu: e.target.value})}
                className={fieldErrors.ibu ? 'input-error' : 'p-2 border rounded'}
                min="0"
                max="100"
              />
              <select
                value={formData.fermentation_type}
                onChange={e => setFormData({...formData, fermentation_type: e.target.value})}
                className="p-2 border rounded"
              >
                <option value="ale">Ale</option>
                <option value="lager">Lager</option>
                <option value="wild">Wild</option>
              </select>
              <input
                type="text"
                placeholder="Brewery"
                value={formData.brewery}
                onChange={e => setFormData({...formData, brewery: e.target.value})}
                className={fieldErrors.brewery ? 'input-error' : 'p-2 border rounded'}
              />
              <input
                  type="number"
                  placeholder="Alcohol Content (%)"
                  value={formData.alcohol_content}
                  onChange={e => setFormData({...formData, alcohol_content: e.target.value})}
                  className={fieldErrors.alcohol_content ? 'input-error' : 'p-2 border rounded'}
                  step="0.1"
                />
                <input
                  type="number"
                  placeholder="Volume (ml)"
                  value={formData.volume_ml}
                  onChange={e => setFormData({...formData, volume_ml: e.target.value})}
                  className={fieldErrors.volume_ml ? 'input-error' : 'p-2 border rounded'}
                />
            </div>
          </div>
        )

      case 'accessories':
        return (
          <div className="col-span-2 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Accessory Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.accessory_type}
                onChange={e => setFormData({...formData, accessory_type: e.target.value})}
                className={fieldErrors.accessory_type ? 'input-error' : 'p-2 border rounded'}
              >
                <option value="">-- Select Type --</option>
                <option value="opener">Opener</option>
                <option value="glassware">Glassware</option>
                <option value="decanter">Decanter</option>
                <option value="gift_set">Gift Set</option>
              </select>
              <input
                type="text"
                placeholder="Material"
                value={formData.material}
                onChange={e => setFormData({...formData, material: e.target.value})}
                className="p-2 border rounded"
              />
              <select
                value={formData.compatible_with_product_type}
                onChange={e => setFormData({...formData, compatible_with_product_type: e.target.value})}
                className="p-2 border rounded"
              >
                <option value="">-- Compatible with --</option>
                <option value="wine">Wine</option>
                <option value="beer">Beer</option>
                <option value="spirits">Spirits</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Beverage Store Admin</h1>
      
      {/* Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg">
            {errorMessage}
          </div>
        )}

      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Category Selector */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Product Category</label>
            <select
              className={fieldErrors.category ? 'input-error' : 'p-2 border rounded'}
              value={formData.category}
              onChange={e => setFormData({
                ...initializeFormData(e.target.value),
                category: e.target.value
              })}
            >
              <option value="">-- Select category --</option>
              <option value="wine">Wine</option>
              <option value="spirits">Spirits</option>
              <option value="beer">Beer</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>

          {/* Common Fields */}
          <div className="space-y-4 col-span-2">
            <div>
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input
                type="text"
                placeholder="Product Name"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className={fieldErrors.name ? 'input-error' : 'p-2 border rounded'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Price (€)</label>
                <input
                  type="number"
                  placeholder="Price"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className={fieldErrors.price ? 'input-error' : 'w-full p-2 border rounded'}
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                <input
                  type="number"
                  placeholder="Stock"
                  value={formData.stock}
                  onChange={e => setFormData({...formData, stock: e.target.value})}
                  className={fieldErrors.stock ? 'input-error' : 'w-full p-2 border rounded'}
                />
              </div>
            </div>

            {formData.category !== 'accessories' && (
              <>              
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="Country"
                      value={formData.country}
                      onChange={e => setFormData({...formData, country: e.target.value})}
                      className={fieldErrors.country ? 'input-error' : 'p-2 border rounded'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Region</label>
                    <input
                      type="text"
                      placeholder="Region"
                      value={formData.region}
                      onChange={e => setFormData({...formData, region: e.target.value})}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    placeholder="Product Description"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Highlight</label>
                  <textarea
                    placeholder="Highlight"
                    value={formData.highlight}
                    onChange={e => setFormData({...formData, highlight: e.target.value})}
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
              </>
            )}
          </div>

          {/* category fields */}
          {renderDynamicFields()}

          {/* Featured Toggle */}
          <div className="col-span-2 flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={e => setFormData({...formData, featured: e.target.checked})}
              className="h-4 w-4"
            />
            <label htmlFor="featured" className="text-sm">
              Mark as Featured Product
            </label>
          </div>

          {/* Image Upload */}
          <div className="col-span-2 mt-4">
            <ImageUploader 
              productId={editingId}
              formData={formData}
              productImages={productImages}
              onImagesUpdate={setProductImages}
            />
            {generationError && (
              <div className="mt-2 p-2 bg-red-100 text-red-800 rounded">
                Eroare generare: {generationError}
              </div>
            )}

            {uploadError && (
              <div className="mt-2 p-2 bg-red-100 text-red-800 rounded">
                Eroare upload: {uploadError}
              </div>
            )}
          </div> 
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {editingId ? 'Update Product' : 'Add Product'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="w-1/3 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Products List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => {
          const mainImage = product.images?.find(img => img.is_main);

          return (
            <div
              key={product.id}
              className="border rounded-2xl p-4 bg-white shadow-md flex flex-col items-stretch justify-between"
            >
              {/* Product name */}
              <h3 className="text-center text-lg font-bold text-gray-800 mb-3">
                {product.name}
              </h3>

              {/* Image */}
              {mainImage && (
                <div className="w-full h-[280px] overflow-hidden rounded-md mb-4 flex justify-center items-center bg-gray-50">
                  <img
                    src={mainImage.url}
                    alt={mainImage.alt_text || product.name}
                    className="w-full max-h-72 object-cover object-center"
                  />
                </div>
              )}

              {/* Details */}
              <div className="flex-1 space-y-1 text-sm text-gray-700">
                <p><span className="font-semibold">Price:</span> €{parseFloat(product.price).toFixed(2)}</p>
                <p><span className="font-semibold">Category:</span> {product.category}</p>

                {product.category === 'wine' && product.details && (
                  <>
                    <p><span className="font-semibold">Type:</span> {product.details.wine_type}</p>
                    <p><span className="font-semibold">Grapes:</span> {product.details.grape_variety}</p>
                    <p><span className="font-semibold">Vintage:</span> {product.details.vintage}</p>
                    <p><span className="font-semibold">Region:</span> { product.region ? [product.region, product.country].join(", ") : product.country}</p>
                  </>
                )}

                {product.category === 'spirits' && product.details && (
                  <>
                    <p><span className="font-semibold">Type:</span> {product.details.spirit_type}</p>
                    <p><span className="font-semibold">Age:</span> {product.details.age_statement}</p>
                    <p><span className="font-semibold">Cask:</span> {product.details.cask_type}</p>
                  </>
                )}

                {product.category === 'beer' && product.details && (
                  <>
                    <p><span className="font-semibold">Style:</span> {product.details.style}</p>
                    <p><span className="font-semibold">IBU:</span> {product.details.ibu}</p>
                    <p><span className="font-semibold">Brewery:</span> {product.details.brewery}</p>
                  </>
                )}

                {product.category === 'accessories' && product.details && (
                  <>
                    <p><span className="font-semibold">Type:</span> {product.details.accessory_type}</p>
                    <p><span className="font-semibold">Material:</span> {product.details.material}</p>
                    <p><span className="font-semibold">Compatible with:</span> {product.details.compatible_with_product_type}</p>
                  </>
                )}

                <p><span className="font-semibold">Stock:</span> {product.stock}</p>

                {product.featured && (
                  <p className="text-green-700 font-semibold">★ Featured</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => handleEdit(product.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(product.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}

export default App
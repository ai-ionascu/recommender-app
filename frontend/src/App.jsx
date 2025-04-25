import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = process.env.NODE_ENV === 'production' 
  ? "http://localhost:3000/api/products" 
  : "http://localhost:3001/products";

function App() {
  const [products, setProducts] = useState([])
  const [formData, setFormData] = useState({
    // Common fields
    name: '',
    price: '',
    category: 'wine',
    country: '',
    region: '',
    description: '',
    highlight: '',
    stock: 0,
    featured: false,
    
    // Wine-specific
    alcohol_content: 13.5,
    volume_ml: 750,
    wine_type: 'red',
    grape_variety: '',
    vintage: new Date().getFullYear(),
    appellation: '',
    serving_temperature: '16',

    // Spirits
    spirit_type: 'whisky',
    age_statement: '',
    distillation_year: '',
    cask_type: '',

    // Beer
    style: '',
    ibu: '',
    fermentation_type: 'ale',
    brewery: '',

    // Accessories
    accessory_type: '',
    material: '',
    compatible_with_product_type: 'wine'
  })

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
  
      if (!formData.name || !formData.price || !formData.category) {
        throw new Error('Mandatory fields: Category, Name and Price');
      }
  
      let response;
      if (editingId) {
        // Update existing product
        response = await axios.put(`${API_URL}/${editingId}`, {
          ...formData,
          details: getCategoryDetails()
        });
        setSuccessMessage('Produsul a fost actualizat cu succes!');
      } else {
        // Create new product
        const payload = {
          ...formData,
          ...(formData.category === 'accessories' && {
            alcohol_content: undefined,
            volume_ml: undefined
          })
        };
        response = await axios.post(API_URL, payload);
        setSuccessMessage('Produsul a fost adăugat cu succes!');
      }
  
      // Refresh products list
      const newProducts = await axios.get(API_URL)
      setProducts(newProducts.data)
      
      // Reset form
      setEditingId(null);
      setFormData(prev => ({
        ...initializeFormData(prev.category),
        category: prev.category
      }))
      
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error('Error saving product:', error)
      setErrorMessage(error.response?.data?.error || error.message);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }

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
      
      setFormData({
        ...product,
        ...product.details
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
    stock: 0,
    featured: false,
    
    // Category-specific defaults
    ...(category === 'wine' && {
      alcohol_content: 13.5,
      volume_ml: 750,
      wine_type: 'red',
      grape_variety: '',
      vintage: new Date().getFullYear(),
      appellation: '',
      serving_temperature: '16'
    }),
    ...(category === 'spirits' && {
      spirit_type: 'whisky',
      age_statement: '',
      distillation_year: '',
      cask_type: ''
    }),
    ...(category === 'beer' && {
      style: '',
      ibu: '',
      fermentation_type: 'ale',
      brewery: ''
    }),
    ...(category === 'accessories' && {
      accessory_type: '',
      material: '',
      compatible_with_product_type: 'wine'
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
                  className="p-2 border rounded"
                  step="0.1"
                />
                <input
                  type="number"
                  placeholder="Volume (ml)"
                  value={formData.volume_ml}
                  onChange={e => setFormData({...formData, volume_ml: e.target.value})}
                  className="p-2 border rounded"
                />
                <select
                  value={formData.wine_type}
                  onChange={e => setFormData({...formData, wine_type: e.target.value})}
                  className="p-2 border rounded"
                >
                  <option value="red">Red</option>
                  <option value="white">White</option>
                  <option value="rose">Rosé</option>
                  <option value="sparkling">Sparkling</option>
                </select>
                <input
                  type="text"
                  placeholder="Grape Variety"
                  value={formData.grape_variety}
                  onChange={e => setFormData({...formData, grape_variety: e.target.value})}
                  className="p-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Vintage Year"
                  value={formData.vintage}
                  onChange={e => setFormData({...formData, vintage: e.target.value})}
                  className="p-2 border rounded"
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
                className="p-2 border rounded"
              >
                <option value="whisky">Whisky</option>
                <option value="vodka">Vodka</option>
                <option value="rum">Rum</option>
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
                className="p-2 border rounded"
                min="1900"
              />
              <input
                type="text"
                placeholder="Cask Type"
                value={formData.cask_type}
                onChange={e => setFormData({...formData, cask_type: e.target.value})}
                className="p-2 border rounded"
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
                className="p-2 border rounded"
              >
                <option value="">Select Style</option>
                <option value="ipa">IPA</option>
                <option value="stout">Stout</option>
                <option value="lager">Lager</option>
                <option value="pilsner">Pilsner</option>
                <option value="sour">Sour</option>
              </select>
              <input
                type="number"
                placeholder="IBU"
                value={formData.ibu}
                onChange={e => setFormData({...formData, ibu: e.target.value})}
                className="p-2 border rounded"
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
                className="p-2 border rounded"
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
                className="p-2 border rounded"
              >
                <option value="">Select Type</option>
                <option value="opener">Opener</option>
                <option value="glassware">Glassware</option>
                <option value="decantor">Decanter</option>
                <option value="cooler">Cooler</option>
                <option value="kit">Accessory Kit</option>
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
              className="w-full p-2 border rounded"
              value={formData.category}
              onChange={e => setFormData({
                ...initializeFormData(e.target.value),
                category: e.target.value
              })}
            >
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
                className="w-full p-2 border rounded"
                required
              />
            </div>

            {formData.category !== 'accessories' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Price (€)</label>
                    <input
                      type="number"
                      placeholder="Price"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full p-2 border rounded"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      placeholder="Stock"
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: e.target.value})}
                      className="w-full p-2 border rounded"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="Country"
                      value={formData.country}
                      onChange={e => setFormData({...formData, country: e.target.value})}
                      className="w-full p-2 border rounded"
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
                  <label className="block text-sm font-medium mb-1">Hightlight</label>
                  <textarea
                    placeholder="Hightlight"
                    value={formData.highlight}
                    onChange={e => setFormData({...formData, highlight: e.target.value})}
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
              </>
            )}
          </div>

          {/* Dynamic Category-Specific Fields */}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="border p-6 rounded-xl bg-white shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
              {product.featured && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                  Featured
                </span>
              )}
            </div>
            
            <div className="space-y-2 text-gray-600">
              <p className="text-2xl font-semibold text-blue-600">
                €{parseFloat(product.price).toFixed(2)}
              </p>
              <p className="capitalize"><span className="font-medium">Type:</span> {product.category}</p>
              
              {product.category === 'wine' && product.details && (
                <>
                  <p><span className="font-medium">Region:</span> {product.region}, {product.country}</p>
                  <p><span className="font-medium">Grapes:</span> {product.details.grape_variety}</p>
                  <p><span className="font-medium">Vintage:</span> {product.details.vintage}</p>
                </>
              )}

              {product.category === 'spirits' && product.details && (
                <>
                  <p><span className="font-medium">Type:</span> {product.details.spirit_type}</p>
                  <p><span className="font-medium">Age:</span> {product.details.age_statement}</p>
                </>
              )}

              <p><span className="font-medium">Stock:</span> {product.stock}</p>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleEdit(product.id)}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              >
                Edit
              </button>
              
              <button
                onClick={() => handleDelete(product.id)}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>  
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
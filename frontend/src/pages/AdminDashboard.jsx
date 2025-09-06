import { useState, useEffect } from 'react';
import { useProducts } from '../hooks/useProducts';
import { getProductById } from '@/api/products';
import ProductForm from '../components/ProductForm';
import ProductCard from '../components/ProductCard';
import { prepareImagePayload } from '../utils/imageUtils';
import Pagination from '@/components/Pagination';

const initialEmptyProduct = {
  name: '', price: '', category: '', country: '', region: '',
  description: '', highlight: '', stock: '', featured: false,
  alcohol_content: '', volume_ml: '',
  wine_type: '', grape_variety: '', vintage: '', appellation: '', serving_temperature: '',
  spirit_type: '', age_statement: '', distillation_year: '', cask_type: '',
  style: '', ibu: '', fermentation_type: '', brewery: '',
  accessory_type: '', material: '', compatible_with_product_type: ''
};

// util: remove empty/undefined/null
const prune = (obj) => Object.fromEntries(
  Object.entries(obj || {}).filter(([_, v]) => v !== undefined && v !== null && v !== '')
);

// split flat form data into { root, details } by category
const splitProductPayload = (form) => {
  const baseKeys = new Set([
    'name','slug','category','price','stock','description','featured','highlight',
    'country','region','alcohol_content','volume_ml'
  ]);

  const byCat = {
    wine: ['wine_type','grape_variety','vintage','appellation','serving_temperature'],
    spirits: ['spirit_type','age_statement','distillation_year','cask_type'],
    beer: ['style','ibu','fermentation_type','brewery'],
    accessories: ['accessory_type','material','compatible_with_product_type'],
  };

  const root = {};
  const details = {};
  const cat = form?.category;

  for (const [k, v] of Object.entries(form || {})) {
    if (baseKeys.has(k)) {
      root[k] = v;
      continue;
    }
    const catFields = byCat[cat] || [];
    if (catFields.includes(k)) {
      details[k] = v;
    }
  }

  return { root: prune(root), details: prune(details) };
};

export default function AdminDashboard() {
  const {
    products,
    total,      // dacă hook-ul tău furnizează total de pe server, îl folosim
    addProduct,
    editProduct,
    removeProduct,
  } = useProducts();

  // paging state 
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const totalCount = Number.isFinite(total) ? total : (Array.isArray(products) ? products.length : 0);

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const visible = (products || []).slice(start, end);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [totalCount, page, pageSize]);

  // form / panel 
  const [formData, setFormData] = useState(initialEmptyProduct);
  const [productImages, setProductImages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [shouldReset, setShouldReset] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const openCreate = () => {
    setError(null);
    setFieldErrors({});
    setEditingId(null);
    setFormData(initialEmptyProduct);
    setProductImages([]);
    setPanelOpen(true);
  };

  const resetForm = () => {
    setFormData(initialEmptyProduct);
    setProductImages([]);
    setEditingId(null);
    setShouldReset(true);
    setTimeout(() => setShouldReset(false), 0);
    setTimeout(() => setSuccess(null), 2500);
  };

  const handleCreateOrUpdate = async (productData) => {
    setError(null);
    setFieldErrors({});
    try {
      const finalImages = await prepareImagePayload(productImages);
      const { root, details } = splitProductPayload(productData);

      // IMPORTANT: backend așteaptă câmpurile specifice categoriei FLAT (nu sub `details`)
      const payload = { ...root, ...details, images: finalImages };

      let res;
      if (editingId) {
        res = await editProduct(editingId, payload);
        setSuccess('Product updated');
      } else {
        res = await addProduct(payload);
        setSuccess('Product added');
      }

      if (res?.info?.mainImageAutoSet) {
        setSuccess((prev) => `${prev}. Main image was automatically reassigned after deletion.`);
      }

      resetForm();
      setPanelOpen(false);

      setPage(1);
      setTimeout(() => {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      }, 0);
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.errors) {
        setFieldErrors(err.response.data.errors);
      } else {
        setError(err.message || 'Error saving product');
      }
    }
  };

  const handleEdit = async (rawId) => {
    const id = Number(rawId);
    try {
      setError(null);
      setFieldErrors({});
      setPanelOpen(true);

      const product = await getProductById(id);
      setFormData({
        ...initialEmptyProduct,
        ...prune(product),
        ...(product.details ? prune(product.details) : {}),
      });
      setProductImages(product.images || []);
      setEditingId(id);

      setTimeout(() => {
        document.getElementById('admin-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load product';
      setError(msg);
      console.warn('[admin/edit] load failed', { id, msg, err });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await removeProduct(id);
      setSuccess('Product deleted');

      // dacă am șters ultimul element de pe pagina curentă → mergem o pagină înapoi
      const remaining = Math.max(0, totalCount - 1);
      const np = Math.max(1, Math.ceil(remaining / pageSize));
      if (page > np) setPage(np);
    } catch {
      setError('Failed to delete product');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {success && <p className="text-green-600 mb-4">{success}</p>}

      {/* Header actions */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">
          {panelOpen ? (editingId ? 'Edit product' : 'Add product') : 'Products'}
        </h2>
        <div className="flex gap-2">
          {!panelOpen && (
            <button
              type="button"
              onClick={openCreate}
              className="px-3 py-2 rounded bg-black text-white"
            >
              Add product
            </button>
          )}
          {panelOpen && (
            <button
              type="button"
              onClick={() => { resetForm(); setPanelOpen(false); }}
              className="px-3 py-2 rounded bg-gray-200"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Collapsible panel */}
      <div
        id="admin-form-panel"
        className={`mb-6 overflow-hidden transition-all duration-300 ease-in-out ${panelOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
      >
        <ProductForm
          formData={formData}
          productImages={productImages}
          fieldErrors={fieldErrors}
          onChange={setFormData}
          onImagesUpdate={setProductImages}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => { resetForm(); setPanelOpen(false); }}
          isEditing={!!editingId}
          shouldReset={shouldReset}
        />
        <hr className="my-6" />
      </div>

      <h2 className="text-xl font-semibold mb-2">Existing Products</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={() => handleEdit(product.id)}
            onDelete={() => handleDelete(product.id)}
          />
        ))}
      </div>

      {totalCount > pageSize && (
        <div className="mt-6">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={totalCount}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

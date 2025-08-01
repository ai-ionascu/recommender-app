import { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import ProductForm from '../components/ProductForm';
import ProductCard from '../components/ProductCard';
import { prepareImagePayload } from '../utils/imageUtils';

const initialEmptyProduct = {
  name: '',
  price: '',
  category: '',
  country: '',
  region: '',
  description: '',
  highlight: '',
  stock: '',
  featured: false,
  alcohol_content: '',
  volume_ml: '',
  wine_type: '',
  grape_variety: '',
  vintage: '',
  appellation: '',
  serving_temperature: '',
  spirit_type: '',
  age_statement: '',
  distillation_year: '',
  cask_type: '',
  style: '',
  ibu: '',
  fermentation_type: '',
  brewery: '',
  accessory_type: '',
  material: '',
  compatible_with_product_type: ''
};

function AdminDashboard() {
    const {
        products,
        addProduct,
        editProduct,
        removeProduct,
        loadProduct
    } = useProducts();

    const [formData, setFormData] = useState(initialEmptyProduct);
    const [productImages, setProductImages] = useState([]);
    const [fieldErrors, setFieldErrors] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [shouldReset, setShouldReset] = useState(false);

    const handleCreateOrUpdate = async (productData) => {
        setError(null);
        setFieldErrors({});

        try {
            console.log('Images before prepare:', productImages);
            const finalImages = await prepareImagePayload(productImages);
            const payload = {
                ...productData,
                images: finalImages
            };

            let res;

            if (editingId) {
                res = await editProduct(editingId, payload);
            setSuccess('Product updated');
            } else {
                console.log('Creating product with data:', payload);
                res = await addProduct(payload);
                setSuccess('Product added');
            }

            if (res.data?.info?.mainImageAutoSet) {
                setSuccess((prev) => `${prev}. Main image was automatically reassigned after deletion.`);
            }

            resetForm();
            setTimeout(() => setShouldReset(false), 0);
        } catch (err) {
            if (err.response?.status === 400 && err.response.data?.errors) {
            setFieldErrors(err.response.data.errors);
            } else {
            setError(err.message || 'Error saving product');
            }
        }
    };

    const handleEdit = async (id) => {
        console.log('Edit pressed for id:', id);
        try {
        const product = await loadProduct(id);
        setFormData({ ...initialEmptyProduct, ...product, ...product.details });
        setProductImages(product.images || []);
        setEditingId(id);
        } catch (err) {
        setError('Failed to load product');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this product?')) return;
        try {
        await removeProduct(id);
        setSuccess('Product deleted');
        } catch (err) {
        setError('Failed to delete product');
        }
    };

    const resetForm = () => {
    setFormData(initialEmptyProduct);
    setProductImages([]);
    setEditingId(null);
    setShouldReset(true);
    setTimeout(() => setShouldReset(false), 0);
    setTimeout(() => setSuccess(null), 3000);
    };

    return (
        <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}
        {success && <p className="text-green-600 mb-4">{success}</p>}

        <ProductForm
            formData={formData}
            productImages={productImages}
            fieldErrors={fieldErrors}
            onChange={setFormData}
            onImagesUpdate={setProductImages}
            onSubmit={handleCreateOrUpdate}
            onCancel={resetForm}
            isEditing={!!editingId}
            shouldReset={shouldReset}
        />

        <hr className="my-6" />

        <h2 className="text-xl font-semibold mb-2">Existing Products</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
            <ProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
            ))}
        </div>
        </div>
    );
}

export default AdminDashboard;

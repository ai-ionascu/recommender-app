// frontend/src/pages/Product.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getProductById } from "@/api/products";
import { useCartStore } from "@/store/cartStore";

function Price({ value, currency = "EUR", className = "" }) {
  const v = Number(value ?? 0);
  return <span className={className}>{v.toFixed(2)} {String(currency).toUpperCase()}</span>;
}

function ImageGallery({ images = [], name = "" }) {
  const [active, setActive] = useState(0);
  if (!images?.length) {
    return <div className="w-full aspect-[4/3] bg-gray-100 rounded-xl" />;
  }
  return (
    <div className="space-y-3">
      <div className="w-full aspect-[4/3] bg-white rounded-xl overflow-hidden shadow">
        <img
          src={images[active]}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-16 h-16 rounded-lg overflow-hidden border ${i === active ? "border-black" : "border-gray-200"}`}
              title={`Image ${i + 1}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [qty, setQty] = useState(1);
  const addToCart = useCartStore((s) => s.addItem);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const data = await getProductById(id);
        if (ignore) return;
        setProduct(data);
      } catch (e) {
        setErr(e?.response?.data?.error || e.message || "Failed to load product.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id]);

  const images = useMemo(() => {
    const p = product || {};
    // normalize common shapes: array of urls or array of {url}
    const raw = p.images || p.photos || p.gallery || [];
    return raw.map((it) => (typeof it === "string" ? it : it?.url || it?.secure_url)).filter(Boolean);
  }, [product]);

  const stock = Number(product?.stock ?? product?.inventory ?? 0);
  console.log("[product] stock", id, stock);
  const canBuy = stock > 0;

  const handleAdd = async () => {
    try {
      await addToCart(product.id ?? product._id ?? id, Number(qty) || 1);
      // Optional: navigate to cart or toast; for now stay here.
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Could not add to cart.");
    }
  };

  if (loading) return <div className="p-6">Loading product…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!product) return <div className="p-6">Product not found.</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-sm mb-4 text-gray-600">
        <Link to="/catalog" className="hover:underline">Catalog</Link>
        <span className="mx-2">/</span>
        <span>{product.name || `Product ${product.id ?? product._id}`}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ImageGallery images={images} name={product.name} />

        <div className="space-y-5">
          <h1 className="text-2xl font-bold">{product.name || `Product ${product.id ?? product._id}`}</h1>

          <div className="text-3xl font-semibold">
            <Price value={product.price} currency={product.currency || "EUR"} />
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            {product.country && <div><span className="font-medium">Country:</span> {product.country}</div>}
            {product.grape && <div><span className="font-medium">Grape:</span> {product.grape}</div>}
            {stock != null && <div><span className="font-medium">Stock:</span> {stock > 0 ? `${stock} available` : "Out of stock"}</div>}
            {product.sku && <div><span className="font-medium">SKU:</span> {product.sku}</div>}
          </div>

          {product.description && (
            <p className="text-gray-800 leading-relaxed">{product.description}</p>
          )}

          {/* Features / tags if present */}
          {Array.isArray(product.features) && product.features.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.features.map((f, i) => (
                <span key={i} className="px-2 py-1 rounded-full bg-gray-100 text-xs">
                  {typeof f === "string" ? f : f?.name || f?.label}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="text-sm">Qty</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 border rounded-lg p-2"
            />
            <button
              onClick={handleAdd}
              disabled={!canBuy}
              className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
              title={!canBuy ? "Out of stock" : "Add to cart"}
            >
              Add to cart
            </button>
          </div>

          {/* Optional CTA to go pay if user already has order pending */}
          <div className="pt-2">
            <button
              onClick={() => navigate("/cart")}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              Go to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

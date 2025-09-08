// frontend/src/components/ProductCard.jsx
import { Link } from "react-router-dom";

export default function ProductCard({ product, onAddToCart }) {
  const id = product?.id ?? product?._id;
  const name = product?.name ?? "Unnamed product";
  const price = Number(product?.price ?? 0);

  const fromArray = (arr) => {
    if (!Array.isArray(arr) || !arr.length) return null;
    const main = arr.find((i) => i?.is_main) || arr[0];
    return main?.url || main?.secure_url || null;
  };

  const img =
    product?.image ||
    product?.image_main?.url ||
    product?.main_image_url ||
    product?.image_url ||
    fromArray(product?.images) ||
    null;

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <Link to={`/product/${id}`} className="block">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100">
          {img ? (
            <img src={img} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
        <div className="mt-2">
          <div className="line-clamp-2 text-sm font-medium">{name}</div>
          <div className="text-xs text-gray-500">{price.toFixed(2)} €</div>
        </div>
      </Link>

      {onAddToCart && (
        <button
          onClick={() => onAddToCart(id, 1)}
          className="mt-2 w-full rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 active:scale-[0.99]"
        >
          Add to cart
        </button>
      )}
    </div>
  );
}

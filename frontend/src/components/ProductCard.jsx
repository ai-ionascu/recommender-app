import React from "react";
import { Link } from "react-router-dom";

function formatPrice(v) {
  const n = Number(v ?? 0);
  return `${n.toFixed ? n.toFixed(2) : n} EUR`;
}

export default function ProductCard({
  product,
  disabled = false,
  onAddToCart,
  onEdit,
  onDelete,
}) {
  const img =
    product?.images?.find((i) => i.is_main)?.url ||
    product?.images?.[0]?.url ||
    null;

  const isAdminMode = Boolean(onEdit || onDelete);
  const handleEdit = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onEdit?.(product.id ?? product._id);
  };
  const handleDelete = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onDelete?.(product.id ?? product._id);
  };
  const handleAdd = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onAddToCart?.(product.id ?? product._id);
  };

  const pid = product.id ?? product._id ?? product.slug;
  const to = pid ? `/product/${encodeURIComponent(pid)}` : undefined;

  return (
    <div className="bg-white rounded-xl shadow flex flex-col">
      {/* image */}
      <div className="aspect-square overflow-hidden rounded-t-xl">
        {to ? (
          <Link
            to={to}
            className="block"
            aria-label={product?.name || "View product"}
          >
            {img ? (
              <img src={img} alt={product?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                No image
              </div>
            )}
          </Link>
        ) : img ? (
          <img src={img} alt={product?.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}
      </div>

      {/* info */}
      <div className="flex flex-col flex-1 p-3">
        {to ? (
          <Link to={to} className="font-semibold mb-1 line-clamp-1 hover:underline">
            {product?.name}
          </Link>
        ) : (
          <h3 className="font-semibold mb-1 line-clamp-1">{product?.name}</h3>
        )}
        {product?.description ? (
          <p className="text-sm text-gray-500 mb-2 line-clamp-2">{product.description}</p>
        ) : (
          <div className="mb-2" />
        )}

        {/* footer */}
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-bold text-gray-800">
            {formatPrice(product?.price)}
          </span>

          <div className="flex gap-2">
            {isAdminMode ? (
              <>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </>
            ) : onAddToCart ? (
              <button
                type="button"
                onClick={handleAdd}
                disabled={disabled}
                className="px-3 py-1 rounded bg-black text-white text-sm disabled:opacity-50"
                title={disabled ? "Unavailable" : "Add to cart"}
              >
                Add
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductCard({ product, onAddToCart }) {
  const mainImage = product.images?.find(i => i.is_main) || product.images?.[0];

  return (
    <div className="bg-white rounded-2xl shadow-md p-3 flex flex-col">
      {/* image */}
      <div className="aspect-square overflow-hidden rounded-xl mb-3 bg-gray-50">
        {mainImage ? (
          <img
            src={mainImage.url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>

      {/* content */}
      <div className="flex-1">
        <h3 className="font-semibold mb-1 line-clamp-2">{product.name}</h3>
        <p className="text-sm text-gray-500 mb-2 capitalize">{product.category}</p>
        <p className="font-bold mb-3">{Number(product.price).toFixed(2)} €</p>
      </div>

      {/* actions */}
      <button
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        onClick={() => onAddToCart?.(product)}
      >
        Add to cart
      </button>
    </div>
  );
}

import PropTypes from 'prop-types';

function ProductCard({ product, onEdit, onDelete }) {
  const mainImage = product.images?.find((img) => img.is_main);

  return (
    <div className="border p-4 rounded shadow-sm">
      <h3 className="font-bold mb-2">{product.name}</h3>
      <p className="text-sm">Category: {product.category}</p>
      <p className="text-sm">Price: €{parseFloat(product.price).toFixed(2)}</p>

      {mainImage && (
        <img
          src={mainImage?.url}
          alt={mainImage.alt_text || product.name}
          className="mt-2 w-full h-48 object-cover rounded"
        />
      )}

      <div className="flex gap-2 mt-3">
        <button
          className="text-blue-600 hover:underline"
          onClick={() => onEdit(product.id)}
        >
          Edit
        </button>
        <button
          className="text-red-600 hover:underline"
          onClick={() => onDelete(product.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

ProductCard.propTypes = {
  product: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ProductCard;
// frontend/src/components/reco/SimilarProducts.jsx
import React from "react";
import { useSimilar } from "@/hooks/useSimilar";
import ProductCard from "@/components/ProductCard";

/**
 * Render a responsive grid with similar products for a given product id.
 */
export default function SimilarProducts({ productId, limit = 8, title = "Similar products" }) {
  const { items, loading, error } = useSimilar(productId, { limit });

  if (!productId) return null;
  if (loading) return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="text-sm opacity-70">Loading recommendations…</div>
    </div>
  );
  if (error) return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="text-sm text-red-600">Could not load recommendations.</div>
    </div>
  );
  if (!items?.length) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

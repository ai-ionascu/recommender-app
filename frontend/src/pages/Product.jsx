// frontend/src/pages/Product.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById, getProductReviews, canUserReview, addProductReview } from "@/api/products";
import SimilarProducts from "@/components/reco/SimilarProducts";
import { useCartStore } from "@/store/cartStore";

function Price({ value }) {
  const v = Number(value ?? 0);
  return <span>{v.toFixed(2)} €</span>;
}

function ImageGallery({ images = [], name = "" }) {
  const [active, setActive] = useState(0);
  if (!images.length) return <div className="aspect-[4/3] w-full rounded-xl bg-gray-100" />;
  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-white shadow">
        <img src={images[active]} alt={name} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-16 w-16 overflow-hidden rounded-lg border ${i === active ? "border-black" : "border-gray-200"}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KV({ label, value }) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return null;
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
    </div>
  );
}

export default function Product() {
  const { id } = useParams();
  const addToCart = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [canReviewState, setCanReviewState] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const data = await getProductById(id);
        if (ignore) return;
        setProduct(data);

        // Reviews
        try {
          const r = await getProductReviews(id);
          if (!ignore) setReviews(Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : []);
        } catch {
          if (!ignore) setReviews([]);
        }

        // “Can review” (UI gating; server should also validate on POST)
        try {
          const ok = await canUserReview(id);
          if (!ignore) setCanReviewState(!!ok);
        } catch {
          if (!ignore) setCanReviewState(false);
        }
      } catch (e) {
        setErr(e?.response?.data?.error || e.message || "Failed to load product.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  const images = useMemo(() => {
    const p = product || {};
    const pick = (x) => (typeof x === "string" ? x : x?.url || x?.secure_url || null);
    const list =
      (Array.isArray(p.images) && p.images.length
        ? p.images
        : p.gallery || p.photos || []);

    return list.map(pick).filter(Boolean);
  }, [product]);

  const stock = Number(product?.stock ?? 0);
  const canBuy = stock > 0;

  const details = useMemo(() => {
    const p = product || {};
    const d = p.details || {}; // wine/spirit/beer/accessory fields
    return [
      ["Category", p.category],
      ["Country", p.country],
      ["Region", p.region],
      // wine
      ["Wine type", d.wine_type],
      ["Grape variety", d.grape_variety],
      ["Appellation", d.appellation],
      ["Vintage", d.vintage],
      // spirits
      ["Spirit type", d.spirit_type],
      ["Age statement", d.age_statement],
      ["Cask type", d.cask_type],
      // beer
      ["Style", d.style],
      ["Fermentation", d.fermentation_type],
      ["IBU", d.ibu],
      // common
      ["ABV", p.alcohol_content ? `${p.alcohol_content}%` : null],
      ["Volume", p.volume_ml ? `${p.volume_ml} ml` : null],
    ];
  }, [product]);

  const features = Array.isArray(product?.features) ? product.features : [];

  const avgRating =
    reviews.length > 0 ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : null;

  const submitReview = async (e) => {
    e.preventDefault();
    if (!canReviewState) return;
    setPosting(true);
    try {
      const created = await addProductReview(id, reviewForm);
      setReviews([created, ...reviews]);
      setReviewForm({ rating: 5, comment: "" });
    } catch (e2) {
      alert(e2?.response?.data?.error || e2.message || "Failed to post review.");
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-5xl p-4">Loading…</div>;
  if (err) return <div className="mx-auto max-w-5xl p-4 text-red-600">{err}</div>;
  if (!product) return null;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="grid gap-8 md:grid-cols-2">
        <ImageGallery images={images} name={product.name} />

        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <div className="mt-1 text-sm text-gray-500">{product.country} {product.region ? `• ${product.region}` : ""}</div>

          <div className="mt-4 text-lg font-semibold"><Price value={product.price} /></div>

          <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{product.description}</p>

          <div className="mt-4 flex items-center gap-3">
            <button
              disabled={!canBuy}
              onClick={() => addToCart(product.id, 1)}
              className="rounded-lg bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {canBuy ? "Add to cart" : "Out of stock"}
            </button>
            <div className="text-xs text-gray-500">Stock: {stock}</div>
          </div>

          {avgRating && (
            <div className="mt-3 text-sm text-gray-700">Average rating: <strong>{avgRating}/5</strong> ({reviews.length})</div>
          )}

          <div className="mt-6 rounded-xl border p-4">
            <h3 className="mb-2 text-sm font-semibold">Details</h3>
            <div className="divide-y">
              {details.map(([k, v]) => (
                <KV key={k} label={k} value={v} />
              ))}
            </div>
          </div>

          {!!features.length && (
            <div className="mt-6 rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-semibold">Features</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {features.map((f, i) => (
                  <li key={f?.id ?? i}>
                    {f?.name || f?.label || "Feature"}{f?.value ? `: ${f.value}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h3 className="mb-2 text-sm font-semibold">Reviews</h3>
          {!reviews.length ? (
            <div className="text-sm text-gray-500">No reviews yet.</div>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">{new Date(r.created_at || r.createdAt || Date.now()).toLocaleString()}</div>
                  <div className="text-sm font-medium">Rating: {r.rating}/5</div>
                  {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border p-4">
          <h3 className="mb-2 text-sm font-semibold">Write a review</h3>
          {!canReviewState ? (
            <div className="text-sm text-gray-500">
              Only customers who purchased this product can write a review.
            </div>
          ) : (
            <form onSubmit={submitReview} className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm">Rating</label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((s) => ({ ...s, rating: Number(e.target.value) }))}
                  className="rounded border px-2 py-1 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((s) => ({ ...s, comment: e.target.value }))}
                className="h-24 w-full rounded border p-2 text-sm"
                placeholder="Share your thoughts…"
              />
              <button
                type="submit"
                disabled={posting}
                className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {posting ? "Posting…" : "Submit review"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Similar products */}
      <div className="mt-12">
        <SimilarProducts productId={product.id} />
      </div>
    </div>
  );
}

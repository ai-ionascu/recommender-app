// frontend/src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";

function SimpleCard({ p }) {
  const id = p.id ?? p._id;
  const img = Array.isArray(p.images)
    ? (typeof p.images[0] === "string" ? p.images[0] : p.images[0]?.url || p.images[0]?.secure_url)
    : p.image || null;
  const price = Number(p.price ?? 0).toFixed(2);

  return (
    <Link to={`/product/${id}`} className="group rounded-xl overflow-hidden border bg-white hover:shadow transition">
      <div className="aspect-[4/3] bg-gray-100">
        {img && <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition" />}
      </div>
      <div className="p-3">
        <div className="font-medium line-clamp-2">{p.name}</div>
        <div className="text-sm text-zinc-600 mt-1">{price} EUR</div>
      </div>
    </Link>
  );
}

export default function Home() {
  // folosim hook-ul existent; dacă are filtre, păstrăm default-urile
  const { products = [] } = useProducts();

  const newArrivals = products.slice(0, 6);
  const staffPicks = products.slice(6, 12);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-white">
        <div className="absolute inset-0 opacity-30">
          <img
            src="https://images.unsplash.com/photo-1506377295352-e3154d43ea9e?q=80&w=1600&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 px-6 md:px-10 py-16 md:py-20">
          <h1 className="font-serif text-4xl md:text-5xl text-zinc-900">
            Discover memorable wines
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-700">
            A curated selection from classic regions and bold new terroirs. Hand-picked. Fast delivery.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/catalog" className="rounded-md bg-rose-700 text-white px-5 py-2.5 hover:bg-rose-800">
              Shop catalog
            </Link>
            <a href="#new" className="rounded-md border px-5 py-2.5 hover:bg-zinc-50">
              New arrivals
            </a>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section id="new">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-semibold">New arrivals</h2>
          <Link to="/catalog" className="text-sm text-rose-700 hover:underline">View all</Link>
        </div>
        {newArrivals.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {newArrivals.map((p) => <SimpleCard key={p.id ?? p._id} p={p} />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-6 text-sm text-zinc-600">No products yet.</div>
        )}
      </section>

      {/* Staff picks */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-semibold">Staff picks</h2>
          <Link to="/catalog" className="text-sm text-rose-700 hover:underline">Explore catalog</Link>
        </div>
        {staffPicks.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {staffPicks.map((p) => <SimpleCard key={p.id ?? p._id} p={p} />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-6 text-sm text-zinc-600">Coming soon.</div>
        )}
      </section>
    </div>
  );
}

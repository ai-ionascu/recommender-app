import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-12 border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 grid gap-6 md:grid-cols-4 text-sm text-zinc-600">
        <div>
          <div className="font-serif text-xl text-zinc-900">WineStore</div>
          <p className="mt-2">Curated wines, fast delivery, expert picks.</p>
        </div>
        <div>
          <div className="font-medium text-zinc-900">Shop</div>
          <ul className="mt-2 space-y-1">
            <li><Link to="/catalog" className="hover:text-zinc-900">All products</Link></li>
            <li><Link to="/faq" className="hover:text-zinc-900">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium text-zinc-900">Support</div>
          <ul className="mt-2 space-y-1">
            <li><Link to="/shipping-returns" className="hover:text-zinc-900">Shipping & Returns</Link></li>
            <li><Link to="/contact" className="hover:text-zinc-900">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium text-zinc-900">Legal</div>
          <ul className="mt-2 space-y-1">
            <li><Link to="/privacy" className="hover:text-zinc-900">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-zinc-900">Terms & Conditions</Link></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-xs text-zinc-500 pb-6">
        © {new Date().getFullYear()} — WineStore
      </div>
    </footer>
  );
}

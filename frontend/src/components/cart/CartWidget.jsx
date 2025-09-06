import { Link } from "react-router-dom";
import { useCartStore } from "@/store/cartStore";

export default function CartWidget() {
  const count = useCartStore((s) => s.items.reduce((a,i)=>a + (i.qty || 1), 0));
  return (
    <Link to="/cart" className="relative inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50">
      Cart
      {count > 0 && (
        <span className="absolute -top-2 -right-2 text-xs rounded-full bg-rose-700 text-white px-1.5 py-0.5">
          {count}
        </span>
      )}
    </Link>
  );
}

import { Link, NavLink, useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import CartWidget from "@/components/cart/CartWidget";
import UserMenu from "@/components/auth/UserMenu";

export default function Navbar() {
  const navigate = useNavigate();

  const onSearch = (payload) => {
    // payload can be a string or an object from autocomplete {id, slug, name}
    if (payload && typeof payload === "object") {
      const id = payload.id ?? payload._id;
      const slug = payload.slug;
      if (id) {
        navigate(`/product/${encodeURIComponent(id)}`);
        return;
      }
      if (slug) {
        navigate(`/product/${encodeURIComponent(slug)}`);
        return;
      }
      const name = payload.name ?? "";
      navigate(`/catalog?q=${encodeURIComponent(name)}`);
      return;
    }

    const q = String(payload || "").trim();
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : `/catalog`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        <Link to="/" className="font-serif text-2xl tracking-wide text-zinc-900">
          Wine<span className="text-rose-700">Store</span>
        </Link>

        <nav className="hidden md:flex items-center gap-4 ml-2">
          <NavLink to="/catalog" className={({isActive}) =>
            `px-2 py-1 rounded ${isActive ? "text-rose-700" : "text-zinc-700 hover:text-zinc-900"}`
          }>
            Catalog
          </NavLink>
          <NavLink to="/about" className="px-2 py-1 text-zinc-700 hover:text-zinc-900">About</NavLink>
          <NavLink to="/contact" className="px-2 py-1 text-zinc-700 hover:text-zinc-900">Contact</NavLink>
        </nav>

        <div className="flex-1 md:mx-4">
          <SearchBar onSubmit={onSearch} placeholder="Search wines, regions, grapes..." />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <CartWidget />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

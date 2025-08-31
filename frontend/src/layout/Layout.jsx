import { Outlet, Link, useLocation } from 'react-router-dom';

function Layout({ children }) {
  const loc = useLocation();
  const active = (p) => loc.pathname.startsWith(p);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 text-white p-4 shadow">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Wine Store Admin</h1>
          <nav className="flex gap-2">
            <Link to="/admin" className={`px-3 py-1 rounded ${active('/admin') ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
              Products
            </Link>
            <Link to="/admin/users" className={`px-3 py-1 rounded ${active('/admin/users') ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
              Users
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4">
        <Outlet />
      </main>

      <footer className="bg-gray-100 text-center p-4 text-sm text-gray-600">
        © {new Date().getFullYear()} - Wine Store
      </footer>
    </div>
  );
}

export default Layout;
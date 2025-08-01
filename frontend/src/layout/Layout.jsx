function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 text-white p-4 shadow">
        <div className="container mx-auto">
          <h1 className="text-xl font-semibold">Wine Store Admin</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>

      <footer className="bg-gray-100 text-center p-4 text-sm text-gray-600">
        © {new Date().getFullYear()} - Wine Store
      </footer>
    </div>
  );
}

export default Layout;

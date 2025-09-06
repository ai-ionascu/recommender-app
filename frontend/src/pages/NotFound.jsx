import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <section className="text-center py-24">
      <h1 className="text-3xl font-semibold">404 – Page not found</h1>
      <p className="mt-2">Let’s get you back to the <Link className="text-rose-700 underline" to="/">home page</Link>.</p>
    </section>
  );
}

import { Outlet } from "react-router-dom";
import Navbar from "@/layout/Navbar";
import Footer from "@/layout/Footer";
import Container from "@/components/ui/Container";

export default function SiteLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-zinc-50 text-zinc-900">
      <Navbar />
      <main className="flex-1">
        <Container className="py-8">
          <Outlet />
        </Container>
      </main>
      <Footer />
    </div>
  );
}

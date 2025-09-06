export default function Contact() {
  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Contact</h1>
      <form className="space-y-3">
        <input className="w-full border rounded-md px-3 py-2" placeholder="Your name" />
        <input className="w-full border rounded-md px-3 py-2" placeholder="Email" type="email" />
        <textarea className="w-full border rounded-md px-3 py-2" rows={5} placeholder="Message" />
        <button type="button" className="rounded-md bg-rose-700 text-white px-4 py-2">Send</button>
      </form>
    </section>
  );
}

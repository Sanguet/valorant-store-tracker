import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-semibold">Esa página no está</h1>
      <Link href="/" className="text-sm text-zinc-300 hover:text-white">
        Volver a la tienda de hoy
      </Link>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { BundlePanel } from "@/components/bundle-panel";
import { getBundle } from "@/domain/queries";
import { getSql } from "@/server/db";

export default async function BundlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const now = new Date();
  const bundle = getBundle(await getSql(), Number(id), now);
  if (!bundle) notFound();
  return (
    <div className="grid gap-4">
      <Link href="/lotes" className="text-sm text-zinc-400 hover:text-white">
        Volver a los lotes
      </Link>
      <BundlePanel bundle={bundle} heading="h1" serverNow={now.getTime()} />
    </div>
  );
}

export function SkinImage({ file, name }: { file: string | null; name: string }) {
  if (!file) {
    return <div className="flex h-36 items-center justify-center bg-white/5 text-2xl text-zinc-500">{name.slice(0, 1)}</div>;
  }
  return <img src={`/imagen/${file}`} alt="" className="h-36 w-full object-cover" />;
}

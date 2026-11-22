export function SkinImage({ file, name, large = false, fill = false }: { file: string | null; name: string; large?: boolean; fill?: boolean }) {
  const height = fill ? "h-full min-h-0 flex-1" : large ? "h-72 sm:h-80" : "h-36";
  if (!file) {
    return (
      <div aria-hidden className={`flex items-center justify-center bg-white/5 text-2xl text-zinc-500 ${height}`}>
        {name.slice(0, 1)}
      </div>
    );
  }
  return <img src={`/imagen/${file}`} alt="" loading="eager" className={`w-full bg-black/25 object-contain object-center ${height}`} />;
}

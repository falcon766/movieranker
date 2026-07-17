import Image from "next/image";
import { posterUrl } from "@/lib/config";

export function Poster({
  path,
  title,
  className = "",
  sizes = "(max-width: 768px) 40vw, 200px",
  priority = false,
  /** Skip Next optimizer — same URL as browser prefetch (battle mode). */
  unoptimized = false,
}: {
  path: string | null | undefined;
  title: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  unoptimized?: boolean;
}) {
  const src = posterUrl(path, "w342");

  return (
    <div className={`poster-frame relative aspect-[2/3] ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes={sizes}
          className="object-cover"
          priority={priority}
          unoptimized={unoptimized}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-ink-3 p-3 text-center text-xs text-bone/40">
          {title}
        </div>
      )}
    </div>
  );
}

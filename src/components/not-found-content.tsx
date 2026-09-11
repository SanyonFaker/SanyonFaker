import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Shared 404 body, rendered by both the root and the public-group fallbacks. */
export function NotFoundContent() {
  return (
    <div className="mx-auto flex min-h-[78svh] max-w-[1800px] flex-col justify-center px-6 py-32 md:px-10">
      <p className="text-micro text-brass">Error 404</p>

      <h1 className="mt-6 max-w-[16ch] text-[clamp(2.2rem,6vw,4.4rem)] font-light leading-[1.02] tracking-[-0.032em] text-chalk">
        This frame is not in the archive.
      </h1>

      <p className="mt-7 max-w-md text-[15px] leading-relaxed text-mist">
        The page you asked for has either been moved or never existed. The index is the best place
        to start again.
      </p>

      <Link
        href="/"
        className="group mt-11 inline-flex items-center gap-2 text-[13px] text-chalk transition-colors duration-300 hover:text-brass"
      >
        <ArrowLeft
          size={14}
          strokeWidth={1.5}
          className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-1"
        />
        Back to the index
      </Link>
    </div>
  );
}

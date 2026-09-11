import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminEmails, getAdminIdentity, isDemoAdminEnabled } from "@/lib/auth";
import { DEMO_MODE, getPhotos } from "@/lib/photos";

export const metadata: Metadata = {
  title: "Studio access",
  description: "Private studio access.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLoginPage() {
  // Already authenticated administrators skip straight through.
  const identity = await getAdminIdentity();
  if (identity) redirect("/admin/dashboard");

  const backdrop = (await getPhotos({ limit: 1 }))[0] ?? null;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* --------------------------------- Form -------------------------------- */}
      <div className="flex flex-col justify-between px-6 py-10 md:px-14 md:py-14">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-mist transition-colors duration-300 hover:text-chalk"
          >
            <ArrowLeft
              size={13}
              strokeWidth={1.5}
              className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-1"
            />
            Back to site
          </Link>

          <span className="text-[11px] tracking-[0.42em] text-ash">LUMEN</span>
        </div>

        <div className="flex flex-1 items-center py-16">
          <LoginForm hint={buildHint()} />
        </div>

        <p className="text-[10px] uppercase tracking-[0.16em] text-ash">
          Unauthorised access is logged
        </p>
      </div>

      {/* ------------------------------- Backdrop ------------------------------ */}
      <div className="relative hidden overflow-hidden border-l border-hairline bg-ink lg:block">
        {backdrop ? (
          <>
            <Image
              src={backdrop.src}
              alt=""
              fill
              sizes="50vw"
              quality={75}
              placeholder={backdrop.blurDataUrl ? "blur" : "empty"}
              blurDataURL={backdrop.blurDataUrl ?? undefined}
              className="object-cover opacity-55"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-12">
              <p className="text-micro text-brass">Archive</p>
              <p className="mt-4 max-w-md text-2xl font-light leading-snug tracking-[-0.02em] text-chalk">
                {backdrop.title ?? "Untitled"}
              </p>
              {backdrop.exif.focalLength || backdrop.exif.aperture ? (
                <p className="mt-3 font-mono text-[11px] tracking-tight text-silver tnum">
                  {[
                    backdrop.exif.camera,
                    backdrop.exif.focalLength,
                    backdrop.exif.aperture,
                    backdrop.exif.shutter,
                    backdrop.exif.iso != null ? `ISO ${backdrop.exif.iso}` : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface to-void" />
        )}
      </div>
    </div>
  );
}

/**
 * A single, precise line explaining what the operator must configure. This is
 * the difference between "it doesn't work" and a fixable five-second read.
 */
function buildHint(): string | null {
  const admins = getAdminEmails();

  if (DEMO_MODE) {
    return isDemoAdminEnabled()
      ? "Demo Mode. Supabase is not configured, so sign in with any e-mail address and the DEMO_ADMIN_PASSWORD from your .env.local. Uploads and edits stay disabled until Supabase is connected."
      : "Demo Mode. Supabase is not configured yet — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, run supabase/schema.sql, then create your account under Authentication → Users. To preview the dashboard locally first, set DEMO_ADMIN_PASSWORD in .env.local.";
  }

  if (admins.length === 0) {
    return "ADMIN_EMAILS is empty, so no account can sign in. Add your address to ADMIN_EMAILS in the environment and redeploy.";
  }

  return `Sign in with a Supabase Auth account listed in ADMIN_EMAILS (${admins.join(", ")}).`;
}

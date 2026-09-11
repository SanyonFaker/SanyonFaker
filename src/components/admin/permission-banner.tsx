"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, ShieldAlert } from "lucide-react";

export type PermissionIssue = {
  reason: "not-listed" | "error";
  email: string;
  detail: string | null;
};

/**
 * Shown when the account can sign in but the *database* will not accept its
 * writes.
 *
 * The confusing case is `not-listed`: `ADMIN_EMAILS` is satisfied, so sign-in
 * and the whole studio load normally, but every write comes back as a raw
 * "new row violates row-level security policy" from Postgres. Rather than let
 * the operator decode that, the studio states the cause and hands over the
 * exact statement that fixes it.
 */
export function PermissionBanner({ issue }: { issue: PermissionIssue }) {
  const [copied, setCopied] = useState(false);
  const sql = allowListSql(issue.email);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard access can be denied; the snippet stays selectable either way.
    }
  };

  const missingList = issue.reason === "not-listed";

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 overflow-hidden rounded-lg border border-brass-dim/70 bg-brass-dim/[0.07]"
      role="alert"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <ShieldAlert size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-brass" />

        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] text-chalk">
            {missingList
              ? "Publishing is blocked by the database's security policy"
              : "The database could not be queried"}
          </h2>

          {missingList ? (
            <>
              <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-silver">
                <span className="font-mono text-brass">{issue.email}</span> can sign in, but it is
                not on the administrator allow-list stored inside the database. Row Level Security
                therefore rejects every upload, edit and delete. That is deliberate — the
                allow-list fails closed — but the two lists have to agree:
              </p>

              <div className="mt-3 grid gap-x-8 gap-y-1.5 text-[11px] text-mist sm:grid-cols-2">
                <p>
                  <span className="text-ash">Application</span> ·{" "}
                  <code className="font-mono">ADMIN_EMAILS</code>{" "}
                  <span className="text-brass">✓ satisfied</span>
                </p>
                <p>
                  <span className="text-ash">Database</span> ·{" "}
                  <code className="font-mono">public.admins</code>{" "}
                  <span className="text-brass">✗ missing</span>
                </p>
              </div>

              <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-mist">
                Run this once in Supabase → SQL Editor
              </p>

              <div className="relative mt-2.5 rounded-md border border-line bg-void/70">
                <pre className="overflow-x-auto px-4 py-3 font-mono text-[12px] leading-relaxed text-chalk">
                  <code>{sql}</code>
                </pre>

                <button
                  type="button"
                  onClick={copy}
                  className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded border border-line bg-ink/90 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-silver transition-colors duration-200 hover:border-ash hover:text-chalk"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={copied ? "copied" : "copy"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check size={11} strokeWidth={2.5} className="text-brass" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={11} strokeWidth={1.75} />
                          Copy
                        </>
                      )}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-mist">
                Then reload this page. Writes re-enable themselves automatically — no redeploy
                needed.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-silver">
                The studio could not read <code className="font-mono">public.admins</code>, which
                usually means <code className="font-mono">supabase/schema.sql</code> has not been
                applied to this project yet. Open{" "}
                <span className="text-chalk">Supabase → SQL Editor</span>, paste the whole file and
                run it; it is idempotent, so running it again is safe.
              </p>

              {issue.detail ? (
                <pre className="mt-4 overflow-x-auto rounded-md border border-line bg-void/70 px-4 py-3 font-mono text-[11px] leading-relaxed text-mist">
                  <code>{issue.detail}</code>
                </pre>
              ) : null}

              <p className="mt-3 text-[11px] leading-relaxed text-mist">
                The file lives at <code className="font-mono">supabase/schema.sql</code> in the
                project root.
              </p>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function allowListSql(email: string): string {
  // The address is already verified against the allow-list, but escape it
  // regardless: this string is rendered as copyable SQL.
  const safe = email.replace(/'/g, "''");
  return [
    "insert into public.admins (email)",
    `  values ('${safe}')`,
    "  on conflict (email) do nothing;",
  ].join("\n");
}

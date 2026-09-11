"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, LockKeyhole } from "lucide-react";
import { signInAction, type SignInState } from "@/app/admin/actions";

const INITIAL: SignInState = { error: null };

/**
 * Studio sign-in.
 *
 * The action is a Server Action, so credentials never travel through a
 * hand-rolled API route and the session cookie is written on the server.
 */
export function LoginForm({ hint }: { hint: string | null }) {
  const [state, formAction] = useActionState(signInAction, INITIAL);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <div className="flex items-center gap-2.5">
        <LockKeyhole size={14} strokeWidth={1.5} className="text-brass" />
        <p className="text-micro text-brass">Studio access</p>
      </div>

      <h1 className="mt-6 text-[clamp(1.7rem,4vw,2.3rem)] font-light leading-tight tracking-[-0.028em] text-chalk">
        Sign in to the archive
      </h1>

      <p className="mt-3 text-[13px] leading-relaxed text-mist">
        This area is private. Authorised accounts only.
      </p>

      <form action={formAction} className="mt-9 space-y-5">
        <Field
          id="email"
          name="email"
          type="email"
          label="E-mail"
          autoComplete="username"
          placeholder="you@example.com"
          required
        />

        <Field
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          required
        />

        <AnimatePresence initial={false}>
          {state.error ? (
            <motion.p
              key={state.error}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-2 overflow-hidden text-[12px] leading-relaxed text-brass"
              role="alert"
            >
              <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>{state.error}</span>
            </motion.p>
          ) : null}
        </AnimatePresence>

        <SubmitButton />
      </form>

      {hint ? (
        <p className="mt-8 border-t border-hairline pt-6 text-[11px] leading-relaxed text-ash">
          {hint}
        </p>
      ) : null}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  id,
  name,
  type,
  label,
  autoComplete,
  placeholder,
  required,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] uppercase tracking-[0.16em] text-mist">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className="mt-2.5 w-full border-b border-line bg-transparent pb-2.5 text-[15px] text-chalk outline-none transition-colors duration-300 focus:border-brass"
      />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative mt-2 flex h-11 w-full items-center justify-center gap-2 overflow-hidden bg-chalk text-[12px] uppercase tracking-[0.18em] text-void transition-opacity duration-300 hover:opacity-90 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          Verifying
        </>
      ) : (
        "Enter studio"
      )}
    </button>
  );
}

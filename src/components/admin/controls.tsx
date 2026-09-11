"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* Shared form furniture for the studio. One place to change the look. */

const FIELD_BASE =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-chalk outline-none transition-colors duration-200 placeholder:text-mist focus:border-brass disabled:opacity-50";

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[10px] uppercase tracking-[0.16em] text-mist">
        {children}
      </label>
      {hint ? <span className="text-[10px] text-ash">{hint}</span> : null}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  className,
  inputMode,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      inputMode={inputMode}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(FIELD_BASE, className)}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(FIELD_BASE, "resize-y leading-relaxed")}
    />
  );
}

export function Select({
  id,
  value,
  onChange,
  disabled,
  children,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(FIELD_BASE, "cursor-pointer appearance-none pr-9")}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-mist"
      >
        <path d="M2 4.5 6 8.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export function Toggle({
  id,
  checked,
  onChange,
  label,
  disabled,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer select-none items-center gap-3 text-[12px] text-silver",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        role="presentation"
        className={cn(
          "relative h-[18px] w-8 shrink-0 rounded-full border transition-colors duration-300",
          checked ? "border-brass-dim bg-brass-dim/40" : "border-line bg-surface",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-3 w-3 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            checked ? "left-[16px] bg-brass" : "left-[3px] bg-mist",
          )}
        />
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}

export function PrimaryButton({
  onClick,
  disabled,
  pending,
  children,
  type = "button",
  className,
}: {
  onClick?: () => void;
  disabled?: boolean;
  pending?: boolean;
  children: ReactNode;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || pending}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-chalk px-5 text-[11px] uppercase tracking-[0.16em] text-void transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {pending ? <Loader2 size={13} strokeWidth={2} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function GhostButton({
  onClick,
  disabled,
  children,
  className,
  title,
  danger,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line px-3.5 text-[11px] uppercase tracking-[0.14em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "text-brass hover:border-brass-dim hover:bg-brass-dim/10"
          : "text-silver hover:border-ash hover:text-chalk",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-hairline bg-ink/60", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            <h2 className="text-[13px] text-chalk">{title}</h2>
            {subtitle ? <p className="mt-1 text-[11px] text-mist">{subtitle}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "idle" | "busy" | "done" | "error";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    idle: "border-line text-mist",
    busy: "border-brass-dim text-brass",
    done: "border-line text-silver",
    error: "border-brass bg-brass-dim/10 text-brass",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-md border px-4 py-3 text-[12px] leading-relaxed",
        tone === "warn"
          ? "border-brass-dim/60 bg-brass-dim/5 text-brass"
          : "border-line bg-surface text-mist",
      )}
    >
      {children}
    </p>
  );
}

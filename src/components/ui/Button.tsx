type ButtonVariant = "primary" | "secondary" | "danger";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-orange-500 text-slate-950 hover:bg-orange-600 dark:bg-orange-400 dark:hover:bg-orange-300",
  secondary:
    "border border-slate-300 text-slate-700 hover:border-orange-400 dark:border-zinc-700 dark:text-slate-300 dark:hover:border-orange-500/60",
  danger: "text-red-600 hover:underline dark:text-red-400",
};

/** Same visual styling as Button, for elements that must be an <a> (e.g. next/link) rather than a <button>. */
export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  const base =
    variant === "danger"
      ? "text-sm font-medium"
      : "rounded-md px-4 py-2 text-sm font-medium transition";
  return `${base} ${VARIANT_CLASS[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

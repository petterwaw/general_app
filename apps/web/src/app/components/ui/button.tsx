import { Button as BaseButton } from "@base-ui/react/button";

import { ThreeBodySpinner } from "./threeBodySpinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg" | "top";

type ButtonProps = React.ComponentProps<typeof BaseButton> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  // the action is on its way: a spinner instead of the label, and no more clicks
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-hover",
  secondary: "bg-secondary text-secondary-ink hover:bg-secondary-hover",
  ghost: "bg-transparent text-primary inset-ring-2 inset-ring-primary-soft hover:bg-primary-soft",
  danger: "bg-danger-soft text-danger",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-[22px] py-3 text-base",
  lg: "w-full px-7 py-4 text-[1.15rem]",
  // top bar: as tall as the game-code chip, shrinks to the icon below 560px
  top: "px-[13px] py-3 text-base min-[561px]:px-[26px] min-[561px]:text-[1.05rem]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-bold",
        "transition-[background-color,transform] duration-150 active:translate-y-px active:scale-[.99]",
        variantClasses[variant],
        sizeClasses[size],
        // loading keeps the button's own colours: it is busy, not unavailable. pointer-events
        // also stop a rendered link, which the disabled attribute does not cover
        loading
          ? "pointer-events-none"
          : // disabled looks the same for every variant: sunken and faint, no action colour
            "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-faint disabled:inset-ring-0",
        className,
      ].join(" ")}
    >
      {loading ? (
        <>
          {/* the label stays, hidden, so the button keeps its width */}
          <span className="invisible contents">{children}</span>
          <ThreeBodySpinner className="absolute" />
        </>
      ) : (
        children
      )}
    </BaseButton>
  );
}

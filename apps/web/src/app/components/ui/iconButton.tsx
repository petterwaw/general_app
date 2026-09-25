import { Button as BaseButton } from "@base-ui/react/button";

type IconButtonProps = React.ComponentProps<typeof BaseButton> & {
  // icon-only buttons need an accessible name
  "aria-label": string;
};

export function IconButton({ className = "", ...props }: IconButtonProps) {
  return (
    <BaseButton
      {...props}
      className={[
        // size can be overridden from outside via --icon-btn-size, without a class conflict
        "grid size-[var(--icon-btn-size,36px)] shrink-0 cursor-pointer place-items-center rounded-full",
        "bg-primary-soft text-primary transition-colors duration-150",
        "hover:bg-primary hover:text-primary-ink",
        "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-faint",
        className,
      ].join(" ")}
    />
  );
}

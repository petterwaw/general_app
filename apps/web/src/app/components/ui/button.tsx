import { Button as BaseButton } from "@base-ui/react/button";

type ButtonProps = React.ComponentProps<typeof BaseButton>;

export function Button({
  className = "",
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      {...props}
      className={[
        "inline-flex h-10 items-center justify-center rounded-lg px-4",
        "bg-neutral-900 text-sm font-medium text-white",
        "transition-colors duration-150",
        "hover:bg-neutral-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}
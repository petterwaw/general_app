import { Input as BaseInput } from "@base-ui/react/input";

type InputProps = React.ComponentProps<typeof BaseInput>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <BaseInput
      {...props}
      className={[
        "h-12 w-full rounded-tile border border-hairline bg-white/70 px-4",
        "text-base font-semibold text-ink placeholder:font-normal placeholder:text-ink-faint",
        "transition-colors duration-150",
        // the field draws its own focus ring, so the global outline is dropped here
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft",
        "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-faint",
        className,
      ].join(" ")}
    />
  );
}

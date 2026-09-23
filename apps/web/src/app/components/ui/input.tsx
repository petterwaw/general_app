import { Input as BaseInput } from "@base-ui/react/input";

type InputProps = React.ComponentProps<typeof BaseInput>;

export function Input({
  className = "",
  ...props
}: InputProps) {
  return (
    <BaseInput
      {...props}
      className={[
        "h-10 w-full rounded-lg border border-neutral-300 bg-white px-3",
        "text-sm text-neutral-900",
        "outline-none",
        "transition-colors duration-150",
        "placeholder:text-neutral-400",
        "focus:border-neutral-500",
        "focus:ring-2 focus:ring-neutral-200",
        className,
      ].join(" ")}
    />
  );
}
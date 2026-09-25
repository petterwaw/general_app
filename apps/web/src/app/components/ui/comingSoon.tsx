import { Tooltip } from "@base-ui/react/tooltip";

type ComingSoonProps = {
  children: React.ReactNode;
  className?: string;
};

// Wraps a disabled control with a "Coming soon" tooltip. A disabled button gets no pointer or
// focus events, so the wrapper is the hover and focus target and the control ignores the pointer.
export function ComingSoon({ children, className = "" }: ComingSoonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        delay={150}
        render={<span tabIndex={0} className={["cursor-not-allowed rounded-full [&>*]:pointer-events-none", className].join(" ")} />}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup
            className={[
              "rounded-full bg-ink px-3.5 py-1.5 text-sm font-bold text-white",
              "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
              "data-starting-style:translate-y-1 data-starting-style:opacity-0",
              "data-ending-style:translate-y-1 data-ending-style:opacity-0",
            ].join(" ")}
          >
            Coming soon
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

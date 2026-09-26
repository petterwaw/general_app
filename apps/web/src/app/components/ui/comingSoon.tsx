import { Popover } from "@base-ui/react/popover";

type ComingSoonProps = {
  children: React.ReactNode;
  className?: string;
};

// Wraps a disabled control with a "Coming soon" bubble. A disabled button gets no pointer or
// focus events, so the wrapper is the hover, tap and focus target and the control ignores the
// pointer. A popover with openOnHover, not a tooltip: tooltips never open on touch, so on a phone
// the bubble would never show.
export function ComingSoon({ children, className = "" }: ComingSoonProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        nativeButton={false}
        render={<span tabIndex={0} className={["cursor-not-allowed rounded-full [&>*]:pointer-events-none", className].join(" ")} />}
      >
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        {/* above, as the tooltip was: a popover opens below by default */}
        <Popover.Positioner side="top" sideOffset={8}>
          <Popover.Popup
            // nothing to act on inside, so the focus stays on the trigger
            initialFocus={false}
            className={[
              "rounded-full bg-ink px-3.5 py-1.5 text-sm font-bold text-white outline-none",
              // Tailwind v4 moves with the `translate` property, not `transform`: both must transition
              "transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
              "data-starting-style:translate-y-1 data-starting-style:opacity-0",
              "data-ending-style:translate-y-1 data-ending-style:opacity-0",
            ].join(" ")}
          >
            Coming soon
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

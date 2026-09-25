import { Dialog } from "@base-ui/react/dialog";

import { IconButton } from "./iconButton";
import { CloseIcon } from "./icons";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // accessible name of the panel, e.g. "Players and game log"
  label: string;
  closeLabel: string;
  children: React.ReactNode;
};

// Side panel sliding in from the right over a dimmed backdrop. Closes on the cross, a backdrop click or Esc.
export function Drawer({ open, onOpenChange, label, closeLabel, children }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-15 bg-ink/35 transition-opacity duration-250 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          aria-label={label}
          className={[
            "fixed inset-y-0 right-0 z-20 w-[min(380px,88vw)] overflow-auto",
            "rounded-l-card bg-surface-solid p-[22px]",
            "transition-transform duration-250 ease-out motion-reduce:transition-none",
            "data-ending-style:translate-x-[105%] data-starting-style:translate-x-[105%]",
          ].join(" ")}
        >
          <Dialog.Close
            render={<IconButton aria-label={closeLabel} className="absolute top-4 right-4" />}
          >
            <CloseIcon />
          </Dialog.Close>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

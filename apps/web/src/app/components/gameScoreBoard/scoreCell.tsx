import { Popover } from "@base-ui/react/popover";

import { Button } from "../ui/button";
import type { Category } from "@dice-app/contracts";

type ScoreCellProps = {
  category: Category;
  value: number | null;
  predictedScore?: number;
  isCurrentPlayer: boolean;
  isSelected: boolean;
  onSelect: (category: Category) => void;
  onSubmit: (category: Category) => void;
};

export function ScoreCell({
  category,
  value,
  predictedScore,
  isCurrentPlayer,
  isSelected,
  onSelect,
  onSubmit,
}: ScoreCellProps) {
  const isAvailable = isCurrentPlayer && value === null;

  if (!isAvailable) {
    return (
      <td
        className={[
          "border-l border-neutral-200 px-3 py-2 text-center",
          isCurrentPlayer ? "bg-neutral-50" : "",
        ].join(" ")}
      >
        <span
          className={[
            "text-sm",
            value === null ? "text-neutral-300" : "text-neutral-700",
          ].join(" ")}
        >
          {value ?? "—"}
        </span>
      </td>
    );
  }

  return (
    <td className="border-l border-neutral-200 bg-neutral-50 px-1 py-1">
      <Popover.Root
        open={isSelected}
        onOpenChange={(open) => {
          if (!open) {
            onSelect(category);
          }
        }}
      >
        <Popover.Trigger
          render={
            <Button
              type="button"
              onClick={() => onSelect(category)}
              className="
                !h-8
                !w-full
                !rounded-md
                !bg-transparent
                !px-2
                !text-sm
                !font-medium
                !text-neutral-600
                !shadow-none
                hover:!bg-neutral-100
                hover:!text-neutral-800
                focus-visible:!bg-neutral-100
                focus-visible:!outline-none
                focus-visible:!ring-1
                focus-visible:!ring-neutral-300
              "
            >
              {predictedScore ?? "—"}
            </Button>
          }
        />

        <Popover.Portal>
          <Popover.Positioner side="top" sideOffset={4}>
            <Popover.Popup className="outline-none">
              <Button
                type="button"
                onClick={() => onSubmit(category)}
                className="
                  !h-7
                  !rounded-md
                  !bg-neutral-900
                  !px-3
                  !text-xs
                  !font-medium
                  !text-white
                  !shadow-none
                  hover:!bg-neutral-900
                  hover:!text-white
                "
              >
                Submit
              </Button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </td>
  );
}
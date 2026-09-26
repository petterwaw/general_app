import Avatar from './avatar';
import { CloseIcon } from '../ui/icons';

type PlayerNameRowProps = {
  value: string;
  onChange: (value: string) => void;
  seat: number;
  placeholder: string;
  // accessible name of the field; `${placeholder} name` when left out
  label?: string;
  autoFocus?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
};

// A player row (same look as PlayerRow) whose name is typed in place: a borderless field next
// to the avatar, which follows the name as it is typed.
export default function PlayerNameRow({
  value,
  onChange,
  seat,
  placeholder,
  label,
  autoFocus = false,
  onRemove,
  removeLabel = 'Remove player',
  onKeyDown,
  onBlur,
}: PlayerNameRowProps) {
  return (
    // no border: the row brightens while the field has focus, the caret does the rest; the
    // global :focus-visible outline is unlayered, so it only gives way to an !important utility
    <div className="flex items-center gap-3 rounded-panel bg-white/60 py-2.5 pr-3.5 pl-2.5 transition-colors duration-150 focus-within:bg-white">
      <Avatar seed={value.trim() || placeholder} seat={seat} size={48} />

      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-label={label ?? `${placeholder} name`}
        maxLength={50}
        className="h-9 min-w-0 flex-1 bg-transparent font-bold text-ink caret-primary placeholder:font-semibold placeholder:text-ink-faint focus-visible:outline-none!"
      />

      {onRemove && (
        <button
          type="button"
          // keeps the focus in the field, so pressing X does not fire the field's blur first
          onMouseDown={(event) => event.preventDefault()}
          onClick={onRemove}
          aria-label={removeLabel}
          className={[
            'grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted',
            'transition-colors duration-150 hover:text-danger',
          ].join(' ')}
        >
          <CloseIcon size={20} />
        </button>
      )}
    </div>
  );
}

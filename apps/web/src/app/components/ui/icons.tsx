// Stroke icons from the prototype (docs/design/prototyp.html). Decorative: the button carries the label.

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, strokeWidth = 2.2, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LeaveIcon(props: IconProps) {
  return (
    <Icon size={20} {...props}>
      <path d="M13 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
      <path d="M10 12h10" />
      <path d="M16.5 8.5 20 12l-3.5 3.5" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon size={16} strokeWidth={2.6} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon size={16} strokeWidth={3} {...props}>
      <path d="M14.5 6 8.5 12l6 6" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon size={14} strokeWidth={3.4} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon size={16} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6.5A1.5 1.5 0 0 1 6.5 5H15" />
    </Icon>
  );
}

type DiceTrayProps = {
  children: React.ReactNode;
  // sits on the tray's bottom edge, e.g. <TurnPill />
  footer?: React.ReactNode;
};

// Wooden rim around violet felt. Must be rendered inside an inline-size container (@container):
// the dice inside are sized from that column's width, not the window's.
export default function DiceTray({ children, footer }: DiceTrayProps) {
  return (
    <div className="relative rounded-[40px] bg-tray-wood p-[18px]">
      <div className="relative grid min-h-[clamp(200px,60cqi,300px)] rounded-[28px] bg-felt-cloth">
        {children}
      </div>
      {footer && (
        <div className="absolute bottom-[-18px] left-1/2 -translate-x-1/2">{footer}</div>
      )}
    </div>
  );
}

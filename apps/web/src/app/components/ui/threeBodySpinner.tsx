import styles from './threeBodySpinner.module.css';

// Three dots circling each other, in the current text colour: the loading state of buttons.
// className should position it (relative or absolute): the dots are placed against it.
// size is any CSS length; an inline custom property, since the module's own rule outranks Tailwind.
export function ThreeBodySpinner({ className = 'relative', size }: { className?: string; size?: string }) {
  const style = size ? ({ '--size': size } as React.CSSProperties) : undefined;

  return (
    <span aria-hidden style={style} className={[styles.threeBody, className].join(' ')}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  );
}

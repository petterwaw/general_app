import styles from './threeBodySpinner.module.css';

// Three dots circling each other, in the current text colour: the loading state of buttons.
// className should position it (relative or absolute): the dots are placed against it
export function ThreeBodySpinner({ className = 'relative' }: { className?: string }) {
  return (
    <span aria-hidden className={[styles.threeBody, className].join(' ')}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  );
}

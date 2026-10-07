import { useLayoutEffect, useState, type DependencyList, type RefObject } from 'react';

// While there is content out of view the list fades out at that edge (top, bottom or both). A
// mask, not an overlay, so it works on any background.
function fadeMask(above: boolean, below: boolean): React.CSSProperties | undefined {
  if (!above && !below) return undefined;
  const top = above ? 'transparent, #000 3rem' : '#000';
  const bottom = below ? '#000 calc(100% - 3rem), transparent' : '#000';
  return { maskImage: `linear-gradient(to bottom, ${top}, ${bottom})` };
}

// The mask style for a scrolling list, kept up to date as it scrolls and resizes. `deps` are what
// changes the list's content. In a column-reverse list the browser counts scrollTop from the
// bottom: 0 there, negative above it.
export function useScrollFade(
  ref: RefObject<HTMLElement | null>,
  deps: DependencyList,
  { reversed = false } = {},
): React.CSSProperties | undefined {
  const [fade, setFade] = useState({ above: false, below: false });

  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;

    function update() {
      if (!list) return;
      const hidden = list.scrollHeight - list.clientHeight;
      const fromTop = reversed ? hidden + list.scrollTop : list.scrollTop;
      const above = fromTop > 1;
      const below = fromTop < hidden - 1;
      // same values keep the same object, so scrolling in the middle does not re-render
      setFade((current) => (current.above === above && current.below === below ? current : { above, below }));
    }

    update();
    list.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener('scroll', update);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller lists what changes the content
  }, [ref, reversed, ...deps]);

  return fadeMask(fade.above, fade.below);
}

'use client';

import { Blobatar } from '@blobatar/react';
import { useGaze } from '@blobatar/react/gaze';
import 'blobatar/motion.css';
// required for the eyes to follow the pointer; without it they hold still
import 'blobatar/gaze.css';

import { playerHue } from './playerColors';

type AvatarProps = {
  // seed: always the participant ID, so the creature never changes with a rename
  participantId: string;
  // leave out when the name is shown next to the avatar, so screen readers do not read it twice
  label?: string;
  seat: number;
  size: number;
  className?: string;
};

// Eye travel in viewBox units (the face is 100 across). Our avatars are small (34–48px),
// so this sits above the library's suggested 1.5–4 to stay visible.
const GAZE_TRAVEL = 5;

// Blobatar drawn in the browser, hue locked to the seat colour, no background plate.
// The eyes follow the pointer; idle motion only plays on hover. The library turns both off
// under prefers-reduced-motion and on touch screens.
export default function Avatar({ participantId, label = '', seat, size, className = '' }: AvatarProps) {
  const { ref } = useGaze({ travel: GAZE_TRAVEL, lookAt: 'pointer' });

  return (
    <Blobatar
      ref={ref}
      name={participantId}
      hue={playerHue(seat)}
      background={false}
      size={size}
      animate="hover"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={['block shrink-0', className].join(' ')}
    />
  );
}

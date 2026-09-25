import { Blobatar } from '@blobatar/react';

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

// Blobatar drawn in the browser, hue locked to the seat colour, no background plate.
export default function Avatar({ participantId, label = '', seat, size, className = '' }: AvatarProps) {
  return (
    <Blobatar
      name={participantId}
      hue={playerHue(seat)}
      background={false}
      size={size}
      alt={label}
      className={['block shrink-0', className].join(' ')}
    />
  );
}

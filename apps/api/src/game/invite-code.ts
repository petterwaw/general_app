import { randomInt } from 'crypto';
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '@dice-app/contracts';

export function generateInviteCode(): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)],
  ).join('');
}

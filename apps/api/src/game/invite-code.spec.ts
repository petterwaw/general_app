import { inviteCodeSchema } from '@dice-app/contracts';
import { generateInviteCode } from './invite-code';

describe('generateInviteCode', () => {
  it('produces codes the invite code schema accepts unchanged', () => {
    for (let i = 0; i < 1000; i++) {
      const code = generateInviteCode();
      expect(inviteCodeSchema.parse(code)).toBe(code);
    }
  });

  it('never uses the look-alike characters 0, O, 1 and I', () => {
    const codes = Array.from({ length: 1000 }, generateInviteCode).join('');
    expect(codes).not.toMatch(/[0O1I]/);
  });
});

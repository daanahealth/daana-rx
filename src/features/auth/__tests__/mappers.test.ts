import { normaliseInvitation, resetSchema, sessionNoticeFor, signInSchema } from '../mappers';

describe('auth mappers', () => {
  it('maps logout reasons to notices', () => {
    expect(sessionNoticeFor(null)).toBeNull();
    expect(sessionNoticeFor('invalid_token')?.tone).toBe('error');
    expect(sessionNoticeFor('inactivity')?.title).toMatch(/inactivity/);
    expect(sessionNoticeFor('whatever')?.title).toBe('Session ended.');
  });

  it('normalises invitations with fallbacks', () => {
    expect(
      normaliseInvitation({
        email: 'x@y.z',
        userRole: 'employee',
        clinic: { name: 'MASS' },
        invitedByUser: { username: 'kim' },
      })
    ).toEqual({
      email: 'x@y.z',
      clinicName: 'MASS',
      invitedBy: 'kim',
      role: 'employee',
    });
    expect(normaliseInvitation(null).clinicName).toBe('the clinic');
  });

  it('validates forms with the MASS password rules', () => {
    expect(signInSchema.safeParse({ email: 'nope', password: '' }).success).toBe(false);
    expect(resetSchema.safeParse({ password: 'Sh0rt!', confirm: 'Sh0rt!' }).success).toBe(false);
    expect(
      resetSchema.safeParse({ password: 'LongEnough1!', confirm: 'Different1!' }).success
    ).toBe(false);
    expect(
      resetSchema.safeParse({ password: 'LongEnough1!', confirm: 'LongEnough1!' }).success
    ).toBe(true);
  });
});

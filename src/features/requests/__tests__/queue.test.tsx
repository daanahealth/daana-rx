import { renderToStaticMarkup } from 'react-dom/server';
import { QueueCard } from '../components/QueueCard';
import { ReasonFields, reasonSchema } from '../components/ReasonDialog';
import { toDispenseRequest } from '../mappers';

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

const pending = toDispenseRequest({
  id: 'r1',
  status: 'pending',
  medicationName: 'Metformin',
  dose: '500 mg',
  form: 'Tablet',
  quantity: 2,
  patientRef: '0012345',
  createdAt: '2026-08-23T14:00:00Z',
  expiresAt: '2026-08-23T16:30:00Z',
  provider: { fullName: 'Karol Patel', credential: 'NP', specialty: 'CARDIO' },
  ageSeconds: 600,
  units: [
    {
      itemId: 'i',
      unitCode: 'DRX-MASS-CARDIO1-00042',
      locationCode: 'CARDIO1',
      expiryDate: '2027-01-31',
      released: false,
    },
  ],
});

describe('Request queue', () => {
  it('card shows provider + credential, unit location/code/expiry, age, TTL and both actions', () => {
    const html = render(
      <QueueCard
        request={pending}
        now={new Date('2026-08-23T14:10:00Z')}
        onFulfill={() => {}}
        onDeny={() => {}}
      />
    );
    expect(html).toContain('Karol Patel, NP');
    expect(html).toContain('CARDIO1');
    expect(html).toContain('DRX-MASS-CARDIO1-00042');
    expect(html).toContain('01/31/2027');
    expect(html).toContain('0012345');
    expect(html).toContain('10 min');
    expect(html).toContain('2 h 20 min left');
    expect(html).toContain('>Fulfill<');
    expect(html).toContain('>Deny<');
    expect(html).toContain('data-status="pending"');
  });

  it('deny requires a reason', () => {
    expect(reasonSchema.safeParse({ reason: '' }).success).toBe(false);
    expect(reasonSchema.safeParse({ reason: '   ' }).success).toBe(false);
    expect(reasonSchema.safeParse({ reason: 'stock damaged' }).success).toBe(true);
    const html = render(<ReasonFields kind="deny" onSubmit={() => {}} />);
    expect(html).toContain('Stock damaged');
    expect(html).toContain('Could not locate');
    expect(html).toContain('Per provider');
    expect(html).toContain('Other');
    expect(html).toContain('required=""');
  });

  it('resolved cards offer Return to shelf only when fulfilled', () => {
    const fulfilled = {
      ...pending,
      status: 'fulfilled' as const,
      resolvedAt: '2026-08-23T15:00:00Z',
    };
    expect(render(<QueueCard request={fulfilled} onReturn={() => {}} />)).toContain(
      'Return to shelf'
    );
    const denied = { ...pending, status: 'denied' as const, reason: 'could not locate' };
    const html = render(<QueueCard request={denied} onReturn={() => {}} />);
    expect(html).not.toContain('Return to shelf');
    expect(html).toContain('could not locate');
  });
});

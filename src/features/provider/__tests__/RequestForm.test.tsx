/**
 * Request modal body, rendered with react-dom/server (node env): flag gating
 * of the patient-ref field, quantity bounded by availability, and the
 * conflict / flag-off / network error rendering.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { RequestForm, classifySubmitError, requestSchema } from '../components/RequestForm';
import { ApiError } from '@/lib/apiClient';
import { DEFAULT_FLAGS, type MedicationCardVM } from '../mappers';

const med: MedicationCardVM = {
  key: 'k',
  medicationName: 'Metformin',
  dose: '500 mg',
  form: 'Tablet',
  specialtyClass: 'ENDOCRINE',
  availableUnits: 3,
  availableQuantity: 3,
  earliestExpiry: '2027-03-07',
};

const render = (el: React.ReactElement) => renderToStaticMarkup(el);
const noop = () => {};

describe('RequestForm', () => {
  it('hides the patient reference unless patient_ref_enabled is on', () => {
    const off = render(
      <RequestForm medication={med} detail={null} flags={DEFAULT_FLAGS} onSubmit={noop} />
    );
    expect(off).not.toContain('Patient reference');
    const on = render(
      <RequestForm
        medication={med}
        detail={null}
        flags={{ ...DEFAULT_FLAGS, patientRefEnabled: true }}
        onSubmit={noop}
      />
    );
    expect(on).toContain('Patient reference');
    expect(on).toContain('Internal sheet # — optional');
    expect(on).toContain('inputMode="numeric"');
  });

  it('bounds the stepper at the available units and states the earliest expiry in MM/DD/YYYY', () => {
    const html = render(
      <RequestForm medication={med} detail={null} flags={DEFAULT_FLAGS} onSubmit={noop} />
    );
    expect(html).toContain('aria-valuemax="3"');
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain('Earliest expiry that would be reserved');
    expect(html).toContain('03/07/2027');
    expect(html).not.toMatch(/DRX-|CARDIO1/);
  });

  it('prefers the FEFO detail over the card when it loads', () => {
    const html = render(
      <RequestForm
        medication={med}
        detail={{
          ...med,
          availableUnits: 1,
          nextExpiries: [{ expiryDate: '2026-11-01', availableUnits: 1, availableQuantity: 1 }],
        }}
        flags={DEFAULT_FLAGS}
        onSubmit={noop}
      />
    );
    expect(html).toContain('aria-valuemax="1"');
    expect(html).toContain('11/01/2026');
  });

  it('renders conflict, flag-off and network errors with a recovery', () => {
    const conflict = render(
      <RequestForm
        medication={med}
        detail={null}
        flags={DEFAULT_FLAGS}
        onSubmit={noop}
        onRetryAvailability={noop}
        submitError={classifySubmitError(
          new ApiError(
            'That unit was just reserved. Next available: Metformin, next FEFO expiry 2027-01-31',
            409
          )
        )}
      />
    );
    expect(conflict).toContain('data-error-kind="conflict"');
    expect(conflict).toContain('That unit was just reserved');
    expect(conflict).toContain('Refresh availability');

    expect(classifySubmitError(new ApiError('off', 403))).toMatchObject({ kind: 'flag-off' });
    expect(classifySubmitError(new ApiError('fetch failed', 0))).toMatchObject({ kind: 'network' });
    expect(classifySubmitError(new Error('boom'))).toMatchObject({
      kind: 'other',
      message: 'boom',
    });
  });

  it('schema: quantity 1..available, patientRef digits only', () => {
    const s = requestSchema(3);
    expect(s.safeParse({ quantity: 4, patientRef: '' }).success).toBe(false);
    expect(s.safeParse({ quantity: 0, patientRef: '' }).success).toBe(false);
    expect(s.safeParse({ quantity: 2, patientRef: 'John' }).success).toBe(false);
    expect(s.safeParse({ quantity: 2, patientRef: '10423' }).success).toBe(true);
  });
});

import type { CSSProperties, ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatMonthYear, EMPTY } from '@/lib/format';

// UnitLabel — the printed 4in × 2in DRX label (QR on the left, facts on the
// right). This is print output, so it deliberately uses fixed inline styles
// rather than the app's tokens: the label must look the same on paper
// regardless of theme.
//
// Styles are hoisted to one module-level map (not nested object literals in
// JSX) — react-doctor's oxlint plugin overflowed its stack walking the
// previous deeply nested inline-style tree. The rendered DOM is identical.

const formatMonthYearOrNA = (d?: string | Date | null) => {
  const out = formatMonthYear(d);
  return out === EMPTY ? 'N/A' : out;
};

const S = {
  root: {
    display: 'flex',
    border: '1px solid #ddd',
    padding: '12px',
    backgroundColor: 'white',
    fontFamily: 'Arial, sans-serif',
    width: '384px',
    height: '192px',
    boxSizing: 'border-box',
  },
  qrColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: '12px',
    borderRight: '1px solid #ddd',
    minWidth: '130px',
  },
  qrCaption: {
    fontSize: '6px',
    marginTop: '4px',
    textAlign: 'center',
    wordBreak: 'break-all',
    maxWidth: '100px',
    lineHeight: 1.2,
  },
  infoColumn: {
    flex: 1,
    paddingLeft: '12px',
    fontSize: '9px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  banner: {
    fontSize: '8px',
    fontWeight: 'bold',
    backgroundColor: '#dc2626',
    color: 'white',
    padding: '2px 4px',
    marginBottom: '3px',
    textAlign: 'center',
    borderRadius: '2px',
  },
  name: { fontSize: '12px', fontWeight: 'bold', lineHeight: 1.1, marginBottom: '1px' },
  generic: { fontSize: '9px', color: '#666', marginBottom: '3px' },
  strength: { fontSize: '10px', fontWeight: 600, marginBottom: '3px' },
  field: { marginBottom: '2px', fontSize: '8px' },
  fieldLabel: { fontWeight: 600 },
  store: { fontSize: '7px', color: '#666' },
  footer: {
    fontSize: '6px',
    color: '#888',
    marginTop: 'auto',
    borderTop: '1px solid #eee',
    paddingTop: '2px',
  },
} satisfies Record<string, CSSProperties>;

type UnitLabelProps = {
  unitId: string;
  medicationName: string;
  genericName?: string | null;
  strength?: number | string | null;
  strengthUnit?: string | null;
  form?: string | null;
  ndcId?: string | null;
  manufacturerLotNumber?: string | null;
  availableQuantity: number | string;
  totalQuantity: number | string;
  expiryDate?: string | Date | null;
  donationSource?: string | null;
  locationName?: string | null;
};

function LabelField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={S.field}>
      <span style={S.fieldLabel}>{label} </span>
      {children}
    </div>
  );
}

export function UnitLabel({
  unitId,
  medicationName,
  genericName,
  strength,
  strengthUnit,
  form,
  ndcId,
  manufacturerLotNumber,
  availableQuantity,
  totalQuantity,
  expiryDate,
  donationSource,
  locationName,
}: UnitLabelProps) {
  const strengthText = strength && strengthUnit ? `${strength} ${strengthUnit}` : '';
  const strengthLine = `${strengthText}${strength && form ? ' - ' : ''}${form || ''}`;

  return (
    <div style={S.root}>
      {/* QR Code - Left Side */}
      <div style={S.qrColumn}>
        <QRCodeSVG value={unitId} size={100} level="H" />
        <div style={S.qrCaption}>{unitId}</div>
      </div>

      {/* Label Information - Right Side */}
      <div style={S.infoColumn}>
        <div style={S.banner}>DONATED MEDICATION</div>

        <div style={S.name}>{medicationName}</div>
        {genericName ? <div style={S.generic}>({genericName})</div> : null}

        {strength || form ? <div style={S.strength}>{strengthLine}</div> : null}

        {ndcId ? <LabelField label="NDC:">{ndcId}</LabelField> : null}

        <LabelField label="Mfr Lot#:">{manufacturerLotNumber || 'NOT RECORDED'}</LabelField>

        <LabelField label="Qty:">
          {availableQuantity} / {totalQuantity}
        </LabelField>

        <LabelField label="EXP:">{formatMonthYearOrNA(expiryDate)}</LabelField>

        <LabelField label="Source:">{donationSource || 'N/A'}</LabelField>

        {locationName ? <div style={S.store}>Store: {locationName}</div> : null}

        <div style={S.footer}>DaanaRX • For Clinic Use Only • FDA-Tracked Medication</div>
      </div>
    </div>
  );
}

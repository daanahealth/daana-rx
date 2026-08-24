/**
 * Smoke tests for the composed layer. Rendered with react-dom/server so they
 * run in the node test environment (no jsdom). Each asserts the component
 * renders, carries its accessibility hooks, and respects the design rules
 * that matter for safety (dates, provider-safe cards, status vocabulary).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { Package } from 'lucide-react';
import { PageHeader } from '../PageHeader';
import { EmptyState } from '../EmptyState';
import { DateText } from '../DateText';
import { KeyValueList } from '../KeyValueList';
import { NavBadge } from '../NavBadge';
import { QuantityStepper } from '../QuantityStepper';
import { MedicationCard } from '../MedicationCard';
import { FilterBar } from '../FilterBar';
import { DataTable, type Column } from '../DataTable';
import { EntityDrawer } from '../EntityDrawer';
import { StatusChip } from '@/components/ui/status-chip';

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('PageHeader', () => {
  it('renders a single h1 with description and actions', () => {
    const html = render(
      <PageHeader title="Inventory" description="Every unit." actions={<button>Check In</button>} />
    );
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('Inventory');
    expect(html).toContain('Every unit.');
    expect(html).toContain('Check In');
  });
});

describe('EmptyState', () => {
  it('is a status region with title, description and action', () => {
    const html = render(
      <EmptyState icon={Package} title="No units" description="Check one in." action={<a>Go</a>} />
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('No units');
    expect(html).toContain('Check one in.');
  });
});

describe('DateText', () => {
  it('renders MM/DD/YYYY in a <time> with an ISO datetime', () => {
    const html = render(<DateText value="2027-03-07" />);
    expect(html).toContain('<time');
    expect(html).toContain('dateTime="2027-03-07"');
    expect(html).toContain('03/07/2027');
  });
  it('marks expired dates as danger and keeps the literal date', () => {
    const html = render(<DateText value="2020-01-01" expiry />);
    expect(html).toContain('data-expiry="expired"');
    expect(html).toContain('01/01/2020');
    expect(html).toContain('expired');
  });
  it('renders the empty marker for a missing date', () => {
    expect(render(<DateText value={null} />)).toContain('—');
  });
});

describe('KeyValueList', () => {
  it('renders dt/dd pairs and mono for codes', () => {
    const html = render(
      <KeyValueList
        items={[
          { label: 'DRX code', value: 'DRX-MASS-CARDIO-00012', code: true },
          { label: 'Qty', value: 3 },
        ]}
      />
    );
    expect(html).toContain('<dt');
    expect(html).toContain('DRX-MASS-CARDIO-00012');
    expect(html).toContain('font-mono');
  });
});

describe('NavBadge', () => {
  it('hides at zero and caps at 99+', () => {
    expect(render(<NavBadge count={0} label="pending" />)).toBe('');
    expect(render(<NavBadge count={3} label="pending" />)).toContain('aria-label="3 pending"');
    expect(render(<NavBadge count={250} label="pending" />)).toContain('99+');
  });
});

describe('QuantityStepper', () => {
  it('exposes a spinbutton with bounds and disables at the max', () => {
    const html = render(<QuantityStepper value={5} onChange={() => {}} min={1} max={5} />);
    expect(html).toContain('role="spinbutton"');
    expect(html).toContain('aria-valuemax="5"');
    expect(html).toContain('aria-valuenow="5"');
    // Increase button is disabled at the bound.
    expect(html).toMatch(/aria-label="Increase quantity"[^>]*disabled/);
  });
});

describe('MedicationCard (provider-safe)', () => {
  it('shows name, dose·form, availability and expiry — and no location/code', () => {
    const html = render(
      <MedicationCard
        name="Metformin"
        dose="500 mg"
        form="Tablet"
        specialty="ENDOCRINE"
        availableUnits={12}
        earliestExpiry="2027-03-07"
      />
    );
    expect(html).toContain('Metformin');
    expect(html).toContain('500 mg · Tablet');
    expect(html).toContain('12 units');
    expect(html).toContain('03/07/2027');
    expect(html).not.toMatch(/DRX-|location|bin/i);
  });
  it('renders the none-available state (spec E1)', () => {
    const html = render(<MedicationCard name="Lisinopril" availableUnits={0} />);
    expect(html).toContain('data-available="none"');
    expect(html).toContain('None available');
  });
  it('becomes a button when clickable', () => {
    const html = render(<MedicationCard name="X" availableUnits={1} onClick={() => {}} />);
    expect(html).toMatch(/<button[^>]*type="button"/);
  });
});

describe('FilterBar', () => {
  it('is a search landmark with a labelled input and clear action', () => {
    const html = render(
      <FilterBar
        search={{ value: 'metf', onChange: () => {}, placeholder: 'Search' }}
        activeCount={2}
        onClear={() => {}}
      />
    );
    expect(html).toContain('role="search"');
    expect(html).toContain('aria-label="Search"');
    expect(html).toContain('Clear (2)');
  });
});

describe('DataTable', () => {
  type Row = { id: string; name: string; qty: number; expiry: string; code: string };
  const rows: Row[] = [
    { id: '1', name: 'Metformin', qty: 3, expiry: '2027-03-07', code: 'DRX-MASS-ENDOCRINE-00001' },
    { id: '2', name: 'Atorvastatin', qty: 1, expiry: '2026-01-01', code: 'DRX-MASS-LIPID-00002' },
  ];
  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Medication',
      primary: true,
      cell: (r) => r.name,
      sortValue: (r) => r.name,
    },
    { key: 'qty', header: 'Qty', kind: 'number', cell: (r) => r.qty, sortValue: (r) => r.qty },
    {
      key: 'expiry',
      header: 'Expiry',
      kind: 'date',
      cell: (r) => <DateText value={r.expiry} expiry />,
    },
    { key: 'code', header: 'DRX code', kind: 'code', cell: (r) => r.code, hideOnMobile: true },
  ];

  it('renders both the desktop table and the mobile list', () => {
    const html = render(<DataTable rows={rows} rowKey={(r) => r.id} columns={columns} />);
    expect(html).toContain('<table');
    expect(html).toContain('<ul');
    expect(html).toContain('Metformin');
    expect(html).toContain('03/07/2027');
    // Sortable header is a button; code column is hidden from the mobile grid.
    expect(html).toMatch(/<button[^>]*>Medication/);
    expect(html.split('DRX-MASS-ENDOCRINE-00001')).toHaveLength(2);
  });
  it('sorts by default sort', () => {
    const html = render(
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        defaultSort={{ key: 'qty', dir: 'asc' }}
      />
    );
    expect(html.indexOf('Atorvastatin')).toBeLessThan(html.indexOf('Metformin'));
    expect(html).toContain('aria-sort="ascending"');
  });
  it('renders skeletons while loading, an empty state and an error state', () => {
    expect(
      render(<DataTable rows={[]} rowKey={(r: Row) => r.id} columns={columns} loading />)
    ).toContain('aria-busy="true"');
    expect(
      render(
        <DataTable
          rows={[]}
          rowKey={(r: Row) => r.id}
          columns={columns}
          empty={{ title: 'No units match' }}
        />
      )
    ).toContain('No units match');
    expect(
      render(
        <DataTable rows={[]} rowKey={(r: Row) => r.id} columns={columns} error="Gateway 502" />
      )
    ).toContain('Gateway 502');
  });
});

describe('EntityDrawer', () => {
  it('renders nothing while closed', () => {
    const html = render(
      <EntityDrawer open={false} onOpenChange={() => {}} title="Unit">
        body
      </EntityDrawer>
    );
    expect(html).not.toContain('body');
  });
});

describe('StatusChip', () => {
  it('renders item, request and cart statuses from the vocabulary', () => {
    expect(render(<StatusChip status="active" />)).toContain('data-status="active"');
    expect(render(<StatusChip status="expired" />)).toContain('Expired');
    expect(render(<StatusChip kind="request" status="denied" />)).toContain('Denied');
    expect(render(<StatusChip kind="cart" status="approved" />)).toContain('Approved');
  });
});

'use client';

/** useUnitLookup — QR / id / search lookup of a legacy unit and its history. */
import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getUnit, listUnitTransactions, searchUnits } from './api';
import {
  classifyLookupInput,
  toScanTransaction,
  toScanUnit,
  type ScanTransaction,
  type ScanUnit,
} from './mappers';

export function useUnitLookup() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [unit, setUnit] = useState<ScanUnit | null>(null);
  const [history, setHistory] = useState<ScanTransaction[]>([]);
  const [results, setResults] = useState<ScanUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  const lookup = useCallback(
    async (unitId: string) => {
      setLoading(true);
      try {
        const found = toScanUnit(await getUnit(unitId));
        setUnit(found);
        setResults([]);
        toast({ title: 'Unit found', description: found.medicationName });
        setHistory((await listUnitTransactions(unitId)).map(toScanTransaction));
      } catch {
        toast({
          title: 'Unit not found',
          description: 'Check the code and try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const search = useCallback(
    (raw: string) => {
      const kind = classifyLookupInput(raw);
      if (kind === 'unit') return void lookup(raw.trim());
      if (kind !== 'search') return;
      const ticket = ++latest.current;
      searchUnits(raw.trim())
        .then((rows) => {
          if (ticket === latest.current) setResults(rows.map(toScanUnit));
        })
        .catch(() => {});
    },
    [lookup]
  );

  const change = (raw: string) => {
    setQuery(raw);
    if (classifyLookupInput(raw) !== 'none') search(raw);
  };

  const select = (row: ScanUnit) => {
    setQuery(row.unitId);
    lookup(row.unitId);
  };

  const clear = () => {
    latest.current++;
    setQuery('');
    setUnit(null);
    setHistory([]);
    setResults([]);
  };

  const scanned = (code: string) => {
    setQuery(code);
    lookup(code);
  };

  return { query, unit, history, results, loading, change, search, select, clear, scanned };
}

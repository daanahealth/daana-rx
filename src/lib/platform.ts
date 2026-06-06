// Verification import: confirms the @daana-health platform packages are wired
// into the DaanaRx Next.js app. Feature agents should import from
// '@daana-health/inventory-core' etc. directly; this file simply re-exports
// a small surface so that broken integration surfaces at build time.

export type {
  Item,
  ItemStatus,
  ItemType,
  Location,
  Transaction,
  Cart,
} from '@daana-health/inventory-core';

export { compareFEFO } from '@daana-health/inventory-core';

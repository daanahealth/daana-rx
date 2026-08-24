/**
 * Composed components — the reusable layer between shadcn primitives
 * (src/components/ui) and feature code. Pages compose these; they do not
 * reach into primitives for layout patterns that exist here.
 *
 * See docs/FRONTEND_ARCHITECTURE.md and DESIGN.md.
 */
export { PageHeader, type PageHeaderProps } from './PageHeader';
export {
  DataTable,
  compareCells,
  type DataTableProps,
  type Column,
  type SortState,
} from './DataTable';
export { FilterBar, type FilterBarProps } from './FilterBar';
export { MedicationCard, type MedicationCardProps } from './MedicationCard';
export { QuantityStepper, type QuantityStepperProps } from './QuantityStepper';
export { EntityDrawer, type EntityDrawerProps } from './EntityDrawer';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { KeyValueList, type KeyValueListProps, type KeyValueItem } from './KeyValueList';
export { DateText, type DateTextProps } from './DateText';
export { NavBadge, type NavBadgeProps } from './NavBadge';
export {
  TextField,
  TextareaField,
  SelectField,
  FieldRow,
  type TextFieldProps,
  type TextareaFieldProps,
  type SelectFieldProps,
  type SelectOption,
} from './fields';
export { StatusChip, type StatusChipProps } from '@/components/ui/status-chip';

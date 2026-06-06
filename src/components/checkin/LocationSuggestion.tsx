'use client';

// LocationSuggestion — shows the classification-based location suggestion and
// lets the user confirm or override via a dropdown of all 14 known location
// codes. Renders a "uncertain class" banner when the classification falls
// back to "Hold".

import { useMemo } from 'react';
import {
  MASS_CLASSIFICATION_GUIDE,
  suggestLocationForClass,
  findClassification,
  type LocationSuggestion as DomainLocationSuggestion,
} from '@daana-health/domain-mass';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, MapPin } from 'lucide-react';

export interface LocationSuggestionProps {
  /** Free-text class or medication name from the form (specialty_class). */
  readonly specialtyClass: string;
  /** Currently confirmed location code. Empty until the user confirms. */
  readonly value: string;
  /** Called when the user picks a location (or accepts the suggestion). */
  readonly onChange: (locationCode: string) => void;
  /**
   * Capacity-warning placeholder. Backend will provide this later.
   * If present, render a yellow banner.
   */
  readonly capacityWarning?: string;
}

/**
 * Resolve the suggestion for the typed specialty_class. Returns undefined when
 * the user has not entered anything.
 */
export function useLocationSuggestion(specialtyClass: string): DomainLocationSuggestion | undefined {
  const q = specialtyClass.trim();
  return useMemo(() => (q.length === 0 ? undefined : suggestLocationForClass(q)), [q]);
}

export function LocationSuggestion({
  specialtyClass,
  value,
  onChange,
  capacityWarning,
}: LocationSuggestionProps) {
  const suggestion = useLocationSuggestion(specialtyClass);
  const isHoldFallback = suggestion?.entry.class_name === 'Hold';
  const requiresReview = suggestion?.requires_supervisor_review ?? false;

  // The selected entry — either the user's override or the suggestion.
  const selectedEntry = value ? findClassification(value) : suggestion?.entry;

  return (
    <div className="space-y-3">
      <Label htmlFor="location_code" className="text-sm font-semibold flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Location bin
        <span className="text-destructive ml-1">*</span>
      </Label>

      {suggestion && (
        <p className="text-sm text-muted-foreground">
          Suggestion based on{' '}
          <span className="font-medium">&quot;{specialtyClass}&quot;</span>:{' '}
          <span className="font-mono font-semibold">{suggestion.location_code}</span>
          {suggestion.match !== 'class_name' && (
            <span className="text-xs"> (matched by {suggestion.match.replace('_', ' ')})</span>
          )}
        </p>
      )}

      <Select
        value={value || suggestion?.location_code || ''}
        onValueChange={onChange}
      >
        <SelectTrigger id="location_code">
          <SelectValue placeholder="Pick a location bin" />
        </SelectTrigger>
        <SelectContent>
          {MASS_CLASSIFICATION_GUIDE.map((entry) => (
            <SelectItem key={entry.location_code} value={entry.location_code}>
              <span className="font-mono mr-2">{entry.location_code}</span>
              <span className="text-muted-foreground text-xs">
                {entry.common_examples.slice(0, 2).join(', ')}
                {entry.common_examples.length > 2 ? '…' : ''}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isHoldFallback && (
        <Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Uncertain class — superadmin review required before placement.
            Confirm the supervisor sign-off checkbox below before continuing.
          </AlertDescription>
        </Alert>
      )}

      {!isHoldFallback && requiresReview && selectedEntry && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Class <span className="font-semibold">{selectedEntry.class_name}</span> requires
            supervisor review per the Medication Classification Guide.
          </AlertDescription>
        </Alert>
      )}

      {capacityWarning && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{capacityWarning}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

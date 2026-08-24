'use client';

/**
 * LocationSuggestion — "the guide suggests bin X; confirm or override".
 * Composed from the field layout, the Select primitive and an Alert; the bin
 * list comes from `useLocations` (Settings) with the classification guide as
 * the fallback. The bin chosen here is authoritative for the unit's class.
 */
import { AlertTriangle } from 'lucide-react';
import { findClassification, suggestLocationForClass } from '@daana-health/domain-mass';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocations } from '../hooks';
import { toLocationOptions } from '../mappers';

export interface LocationSuggestionProps {
  /** Free-text class or medication name from the form (specialty_class). */
  readonly specialtyClass: string;
  /** The confirmed bin code; empty until seeded/picked. */
  readonly value: string;
  readonly onChange: (locationCode: string) => void;
}

const MATCH_LABEL: Record<string, string> = {
  class_name: 'class name',
  location_code: 'bin code',
  example: 'a known medication',
  substring: 'a partial match',
  fallback: 'the Hold fallback',
};

export function LocationSuggestion({ specialtyClass, value, onChange }: LocationSuggestionProps) {
  const q = specialtyClass.trim();
  const suggestion = q ? suggestLocationForClass(q) : undefined;
  const isHoldFallback = suggestion?.entry.class_name === 'Hold';
  const requiresReview = suggestion?.requires_supervisor_review ?? false;
  const selectedEntry = value ? findClassification(value) : suggestion?.entry;

  const locations = useLocations();
  const options = toLocationOptions(locations.status === 'success' ? locations.data : []);

  return (
    <div className="space-y-1.5">
      <Label htmlFor="location_code" className="text-xs font-medium text-subtle-foreground">
        Location bin
      </Label>

      <Select value={value || suggestion?.location_code || ''} onValueChange={onChange}>
        <SelectTrigger id="location_code" className="h-11 sm:h-10">
          <SelectValue placeholder="Pick a location bin" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.code} value={opt.code}>
              <span className="font-mono">{opt.code}</span>
              {opt.hint ? (
                <span className="ml-2 text-xs text-muted-foreground">{opt.hint}</span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {suggestion ? (
        <p className="text-xs text-muted-foreground">
          Suggested from &ldquo;{q}&rdquo;:{' '}
          <span className="font-mono font-medium text-foreground">
            {suggestion.location_code}
          </span>
          {suggestion.match !== 'class_name' ? (
            <> (matched by {MATCH_LABEL[suggestion.match] ?? suggestion.match})</>
          ) : null}
          . Override it if the shelf says otherwise.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          No specialty class was entered, so pick the bin the shelf uses.
        </p>
      )}

      {locations.status === 'error' ? (
        <p className="text-xs text-muted-foreground">
          Configured bins could not be loaded ({locations.message}); showing the classification
          guide&apos;s example bins. Manage bins under Settings → Locations.
        </p>
      ) : null}

      {isHoldFallback ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The class is uncertain, so this goes to Hold. A superadmin must review it — tick the
            acknowledgement below before continuing.
          </AlertDescription>
        </Alert>
      ) : requiresReview && selectedEntry ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Class <span className="font-medium">{selectedEntry.class_name}</span> requires
            supervisor review per the Medication Classification Guide.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

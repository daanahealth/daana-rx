'use client';

import * as React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatDate, maskUSDate, parseUSDate, toISODate } from '@/lib/format';

/**
 * Form field wrappers — one component per field kind so every form in the
 * app has the same label / control / helper / error layout, wired to
 * react-hook-form + zod through the existing <Form> primitives.
 *
 *   const form = useForm<Values>({ resolver: zodResolver(schema) });
 *   <Form {...form}>
 *     <TextField control={form.control} name="patientRef" label="Patient reference"
 *       description="Internal sheet # — optional" inputMode="numeric" />
 *     <SelectField control={form.control} name="credential" label="Credential"
 *       options={[{ value: 'NP', label: 'NP' }]} />
 *   </Form>
 */

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  name: FieldPath<TValues>;
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  /** Marks the label with "optional" instead of forcing an asterisk on the rest. */
  optional?: boolean;
}

function LabelText({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <>
      {children}
      {optional ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
    </>
  );
}

export type TextFieldProps<TValues extends FieldValues> = BaseFieldProps<TValues> &
  Omit<React.ComponentProps<typeof Input>, 'name'>;

export function TextField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  optional,
  ...inputProps
}: TextFieldProps<TValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('space-y-1.5', className)}>
          <FormLabel className="text-xs font-medium text-subtle-foreground">
            <LabelText optional={optional}>{label}</LabelText>
          </FormLabel>
          <FormControl>
            <Input {...inputProps} {...field} value={field.value ?? ''} />
          </FormControl>
          {description ? (
            <FormDescription className="text-xs">{description}</FormDescription>
          ) : null}
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

export type TextareaFieldProps<TValues extends FieldValues> = BaseFieldProps<TValues> &
  Omit<React.ComponentProps<typeof Textarea>, 'name'>;

export function TextareaField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  optional,
  ...textareaProps
}: TextareaFieldProps<TValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('space-y-1.5', className)}>
          <FormLabel className="text-xs font-medium text-subtle-foreground">
            <LabelText optional={optional}>{label}</LabelText>
          </FormLabel>
          <FormControl>
            <Textarea {...textareaProps} {...field} value={field.value ?? ''} />
          </FormControl>
          {description ? (
            <FormDescription className="text-xs">{description}</FormDescription>
          ) : null}
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export type SelectFieldProps<TValues extends FieldValues> = BaseFieldProps<TValues> & {
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
};

export function SelectField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  optional,
  options,
  placeholder = 'Select…',
  disabled,
}: SelectFieldProps<TValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('space-y-1.5', className)}>
          <FormLabel className="text-xs font-medium text-subtle-foreground">
            <LabelText optional={optional}>{label}</LabelText>
          </FormLabel>
          <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={disabled}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? (
            <FormDescription className="text-xs">{description}</FormDescription>
          ) : null}
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

export type DateFieldProps<TValues extends FieldValues> = BaseFieldProps<TValues> & {
  placeholder?: string;
  disabled?: boolean;
  /** Extra props for the underlying <input> (id, autoFocus…). */
  inputProps?: Omit<
    React.ComponentProps<typeof Input>,
    'name' | 'value' | 'onChange' | 'onBlur' | 'placeholder' | 'disabled'
  >;
};

/**
 * DateField — a date typed and read as MM/DD/YYYY (DESIGN.md: one date format
 * everywhere), stored in the form as YYYY-MM-DD for the API. Typing masks the
 * slashes in; the trailing calendar button opens a picker for the same field.
 * An unparseable entry is left in the field as typed so the Zod message
 * ("Enter the date as MM/DD/YYYY") can point at it.
 */
export function DateField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  optional,
  placeholder = 'MM/DD/YYYY',
  disabled,
  inputProps,
}: DateFieldProps<TValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('space-y-1.5', className)}>
          <FormLabel className="text-xs font-medium text-subtle-foreground">
            <LabelText optional={optional}>{label}</LabelText>
          </FormLabel>
          <DateInput
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder={placeholder}
            disabled={disabled}
            inputProps={inputProps}
          />
          {description ? (
            <FormDescription className="text-xs">{description}</FormDescription>
          ) : null}
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

function displayFor(value: string): string {
  if (!value) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value;
}

function DateInput({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  inputProps,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
  placeholder: string;
  disabled?: boolean;
  inputProps?: DateFieldProps<FieldValues>['inputProps'];
}) {
  const [draft, setDraft] = React.useState(() => displayFor(value));
  // Re-sync the text when the form value changes underneath us (reset, picker,
  // a fallback button) — derived state from props, no effect needed.
  const [synced, setSynced] = React.useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(displayFor(value));
  }
  const [open, setOpen] = React.useState(false);

  const commit = (text: string) => {
    if (!text.trim()) return onChange('');
    const iso = parseUSDate(text);
    onChange(iso ?? text);
  };

  const selected = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <div className="flex items-stretch gap-2">
      <FormControl>
        <Input
          {...inputProps}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          value={draft}
          onChange={(e) => {
            const next = maskUSDate(e.target.value);
            setDraft(next);
            if (next.length === 10) commit(next);
          }}
          onBlur={() => {
            commit(draft);
            onBlur();
          }}
          className="tabular-nums"
        />
      </FormControl>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label="Pick a date"
            className="h-10 w-11 shrink-0 sm:w-10"
          >
            <CalendarIcon aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              onChange(d ? toISODate(d) : '');
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * FieldRow — lays sibling fields out side by side on ≥ sm, stacked on phones.
 */
export function FieldRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

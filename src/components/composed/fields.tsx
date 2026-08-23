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
import { cn } from '@/lib/utils';

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

import * as React from 'react';
import { useFormContext, Controller, type ControllerProps, type FieldPath, type FieldValues } from 'react-hook-form';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../../lib/utils';
import { Label } from './label';

// ── FormField ──────────────────────────────────────────────────────────────────
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;
  return { id, name: fieldContext.name, formItemId: `${id}-form-item`, formMessageId: `${id}-form-message`, ...fieldState };
};

// ── FormItem ──────────────────────────────────────────────────────────────────
type FormItemContextValue = { id: string };
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = 'FormItem';

// ── FormLabel ──────────────────────────────────────────────────────────────────
const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();
  return (
    <Label
      ref={ref}
      className={cn(error && 'text-red-600', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

// ── FormControl ───────────────────────────────────────────────────────────────
const FormControl = React.forwardRef<
  React.ElementRef<typeof React.Fragment>,
  React.HTMLAttributes<HTMLElement>
>(({ ...props }, ref) => {
  const { error, formItemId, formMessageId } = useFormField();
  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      id={formItemId}
      aria-describedby={!error ? formMessageId : `${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';

// ── FormMessage ───────────────────────────────────────────────────────────────
const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message) : children;
    if (!body) return null;
    return (
      <p ref={ref} id={formMessageId} className={cn('text-xs text-red-600', className)} {...props}>
        {body}
      </p>
    );
  }
);
FormMessage.displayName = 'FormMessage';

// ── FormRoot ──────────────────────────────────────────────────────────────────
import { FormProvider } from 'react-hook-form';
const Form = FormProvider;

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, useFormField };

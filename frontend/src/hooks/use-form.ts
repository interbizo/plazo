"use client";

import { useState, useCallback, useRef } from "react";
import type { ZodSchema, ZodError } from "zod";

interface UseFormOptions<T> {
  schema: ZodSchema<T>;
  initialValues: T;
  onSubmit: (data: T) => Promise<void> | void;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isDirty: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: (newValues?: T) => void;
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    error?: string;
  };
  validate: () => boolean;
}

/**
 * Lightweight form hook with Zod validation.
 * Replaces ad-hoc useState + manual validation patterns.
 *
 * Usage:
 *   const form = useForm({
 *     schema: loginSchema,
 *     initialValues: { email: "", password: "" },
 *     onSubmit: async (data) => { await login(data); },
 *   });
 *
 *   <Input {...form.getFieldProps("email")} label="Email" />
 *   <Button onClick={form.handleSubmit} isLoading={form.isSubmitting}>Submit</Button>
 */
export function useForm<T extends Record<string, any>>({
  schema,
  initialValues,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const initialRef = useRef(initialValues);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    // Clear error for this field when user types
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const setValues = useCallback((partial: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...partial }));
    setIsDirty(true);
  }, []);

  const validate = useCallback((): boolean => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: Partial<Record<keyof T, string>> = {};
    const zodError = result.error as ZodError;
    for (const issue of zodError.issues) {
      const field = issue.path[0] as keyof T;
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return false;
  }, [schema, values]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!validate()) return;

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, onSubmit, values],
  );

  const reset = useCallback(
    (newValues?: T) => {
      const resetTo = newValues || initialRef.current;
      setValuesState(resetTo);
      setErrors({});
      setIsDirty(false);
    },
    [],
  );

  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field] ?? "",
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => {
        const target = e.target;
        const newValue =
          target.type === "number"
            ? (Number(target.value) as any)
            : (target.value as any);
        setValue(field, newValue);
      },
      error: errors[field],
    }),
    [values, errors, setValue],
  );

  return {
    values,
    errors,
    isSubmitting,
    isDirty,
    setValue,
    setValues,
    handleSubmit,
    reset,
    getFieldProps,
    validate,
  };
}

import { useState, useCallback } from 'react';
import { z } from 'zod';

/**
 * Custom hook untuk form validation dengan Zod
 * 
 * Usage:
 * const { errors, validate, clearError } = useFormValidation(schema);
 * 
 * const handleSubmit = async (e) => {
 *   e.preventDefault();
 *   const result = validate(formData);
 *   if (!result.success) return;
 *   // Submit form
 * };
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export function useFormValidation<T extends z.ZodType<any, any>>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form data against schema
   */
  const validate = useCallback(
    (data: unknown): ValidationResult<z.infer<T>> => {
      try {
        const validData = schema.parse(data);
        setErrors({});
        return {
          success: true,
          data: validData,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formattedErrors: Record<string, string> = {};
          error.errors.forEach((err) => {
            const path = err.path.join('.');
            formattedErrors[path] = err.message;
          });
          setErrors(formattedErrors);
          return {
            success: false,
            errors: formattedErrors,
          };
        }
        return {
          success: false,
          errors: { _form: 'Validation error occurred' },
        };
      }
    },
    [schema]
  );

  /**
   * Validate single field
   */
  const validateField = useCallback(
    (fieldName: string, value: unknown): boolean => {
      try {
        // Get field schema
        const fieldSchema = (schema as any).shape?.[fieldName];
        if (!fieldSchema) return true;

        fieldSchema.parse(value);
        
        // Clear error for this field
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
        
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors[0]?.message || 'Invalid value';
          setErrors((prev) => ({
            ...prev,
            [fieldName]: errorMessage,
          }));
          return false;
        }
        return false;
      }
    },
    [schema]
  );

  /**
   * Clear error for specific field
   */
  const clearError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Set custom error
   */
  const setError = useCallback((fieldName: string, message: string) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: message,
    }));
  }, []);

  /**
   * Check if field has error
   */
  const hasError = useCallback(
    (fieldName: string): boolean => {
      return fieldName in errors;
    },
    [errors]
  );

  /**
   * Get error message for field
   */
  const getError = useCallback(
    (fieldName: string): string | undefined => {
      return errors[fieldName];
    },
    [errors]
  );

  return {
    errors,
    validate,
    validateField,
    clearError,
    clearErrors,
    setError,
    hasError,
    getError,
  };
}

/**
 * Helper function to get error message from field name
 */
export function getFieldError(
  errors: Record<string, string>,
  fieldName: string
): string | undefined {
  return errors[fieldName];
}

/**
 * Helper function to check if field has error
 */
export function hasFieldError(
  errors: Record<string, string>,
  fieldName: string
): boolean {
  return fieldName in errors;
}

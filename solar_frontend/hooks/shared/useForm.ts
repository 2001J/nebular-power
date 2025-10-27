import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  onSuccess?: (values: T) => void;
  onError?: (error: Error) => void;
  validate?: (values: T) => Record<string, string> | null;
  showToastOnSuccess?: boolean;
  showToastOnError?: boolean;
  successMessage?: string;
}

export interface FormState<T> {
  values: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  hasBeenSubmitted: boolean;
  isValid: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearErrors: () => void;
  reset: () => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  getFieldProps: (field: keyof T) => {
    value: T[keyof T];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    error: string | undefined;
  };
}

/**
 * A comprehensive form handling hook with validation and submission
 */
export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): FormState<T> {
  const {
    initialValues,
    onSubmit,
    onSuccess,
    onError,
    validate,
    showToastOnSuccess = false,
    showToastOnError = true,
    successMessage = 'Operation completed successfully'
  } = options;

  const [formValues, setFormValues] = useState<T>(initialValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBeenSubmitted, setHasBeenSubmitted] = useState(false);
  
  const { toast } = useToast();

  // Validate current values
  const currentErrors = validate ? validate(formValues) : null;
  const isValid = !currentErrors || Object.keys(currentErrors).length === 0;

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when value changes
    if (formErrors[field as string]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [formErrors]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setFormValues(prev => ({ ...prev, ...newValues }));
  }, []);

  const setError = useCallback((field: string, error: string) => {
    setFormErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearError = useCallback((field: string) => {
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setFormErrors({});
  }, []);

  const reset = useCallback(() => {
    setFormValues(initialValues);
    setFormErrors({});
    setIsSubmitting(false);
    setHasBeenSubmitted(false);
  }, [initialValues]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setHasBeenSubmitted(true);

    // Run validation
    const validationErrors = validate ? validate(formValues) : null;
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit(formValues);
      
      if (showToastOnSuccess) {
        toast({
          title: 'Success',
          description: successMessage,
        });
      }
      
      onSuccess?.(formValues);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Submission failed');
      
      if (showToastOnError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message,
        });
      }
      
      onError?.(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formValues, validate, onSubmit, onSuccess, onError, showToastOnSuccess, showToastOnError, successMessage, toast]);

  const getFieldProps = useCallback((field: keyof T) => ({
    value: formValues[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : e.target.value;
      setValue(field, value as T[keyof T]);
    },
    error: formErrors[field as string]
  }), [formValues, formErrors, setValue]);

  // Merge validation errors with manual errors
  const allErrors = { ...formErrors, ...(currentErrors || {}) };

  return {
    values: formValues,
    errors: allErrors,
    isSubmitting,
    hasBeenSubmitted,
    isValid,
    setValue,
    setValues,
    setError,
    clearError,
    clearErrors,
    reset,
    handleSubmit,
    getFieldProps
  };
}

/**
 * Simple validation helpers
 */
export const validators = {
  required: (value: any, fieldName: string = 'Field') => 
    !value || (typeof value === 'string' && value.trim() === '') 
      ? `${fieldName} is required` 
      : null,
  
  email: (value: string) => 
    value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)
      ? 'Invalid email address'
      : null,
  
  minLength: (min: number, fieldName: string = 'Field') => (value: string) =>
    value && value.length < min
      ? `${fieldName} must be at least ${min} characters`
      : null,
  
  maxLength: (max: number, fieldName: string = 'Field') => (value: string) =>
    value && value.length > max
      ? `${fieldName} must be at most ${max} characters`
      : null,
  
  pattern: (regex: RegExp, message: string) => (value: string) =>
    value && !regex.test(value) ? message : null,
};

/**
 * Compose multiple validators for a field
 */
export function composeValidators<T>(...validators: Array<(value: T) => string | null>) {
  return (value: T): string | null => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };
}

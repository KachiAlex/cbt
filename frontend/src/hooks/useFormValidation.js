import { useState, useCallback } from 'react';
import { validateForm, sanitizeFormData, VALIDATION_RULES, SANITIZATION_RULES } from '../utils/validation';

// Custom hook for form validation and sanitization
export const useFormValidation = (initialData = {}, validationRules = {}, sanitizationRules = {}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [errors]);

  // Mark field as touched
  const touchField = useCallback((field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  }, []);

  // Validate single field
  const validateField = useCallback((field, value = formData[field]) => {
    if (!validationRules[field]) return null;

    for (const rule of validationRules[field]) {
      const error = rule(value);
      if (error) {
        setErrors(prev => ({
          ...prev,
          [field]: error
        }));
        return error;
      }
    }

    // Clear error if validation passes
    setErrors(prev => ({
      ...prev,
      [field]: null
    }));
    return null;
  }, [formData, validationRules]);

  // Validate all fields
  const validateAll = useCallback(() => {
    const validation = validateForm(formData, validationRules);
    setErrors(validation.errors);
    return validation.isValid;
  }, [formData, validationRules]);

  // Sanitize form data
  const sanitizeData = useCallback(() => {
    return sanitizeFormData(formData, sanitizationRules);
  }, [formData, sanitizationRules]);

  // Handle form submission
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    
    try {
      // Mark all fields as touched
      const allTouched = {};
      Object.keys(formData).forEach(field => {
        allTouched[field] = true;
      });
      setTouched(allTouched);

      // Validate form
      const isValid = validateAll();
      if (!isValid) {
        return false;
      }

      // Sanitize data
      const sanitizedData = sanitizeData();

      // Call onSubmit with sanitized data
      await onSubmit(sanitizedData);
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateAll, sanitizeData]);

  // Reset form
  const resetForm = useCallback((newData = {}) => {
    setFormData(newData);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, []);

  // Get field error (only show if touched)
  const getFieldError = useCallback((field) => {
    return touched[field] ? errors[field] : null;
  }, [touched, errors]);

  // Check if field has error
  const hasFieldError = useCallback((field) => {
    return touched[field] && !!errors[field];
  }, [touched, errors]);

  // Check if form is valid
  const isFormValid = useCallback(() => {
    return Object.keys(errors).length === 0 && Object.values(errors).every(error => !error);
  }, [errors]);

  // Get form state
  const getFormState = useCallback(() => ({
    isValid: isFormValid(),
    isSubmitting,
    hasErrors: Object.keys(errors).length > 0,
    errors,
    touched
  }), [isFormValid, isSubmitting, errors, touched]);

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    updateField,
    touchField,
    validateField,
    validateAll,
    sanitizeData,
    handleSubmit,
    resetForm,
    getFieldError,
    hasFieldError,
    isFormValid,
    getFormState
  };
};

// Pre-configured hooks for common forms
export const useUserRegistrationForm = (initialData = {}) => {
  return useFormValidation(
    initialData,
    VALIDATION_RULES.USER_REGISTRATION,
    {
      username: SANITIZATION_RULES.USERNAME,
      email: SANITIZATION_RULES.EMAIL,
      fullName: SANITIZATION_RULES.FULL_NAME,
      phone: SANITIZATION_RULES.TEXT_INPUT
    }
  );
};

export const useUserLoginForm = (initialData = {}) => {
  return useFormValidation(
    initialData,
    VALIDATION_RULES.USER_LOGIN,
    {
      username: SANITIZATION_RULES.USERNAME
    }
  );
};

export const useExamForm = (initialData = {}) => {
  return useFormValidation(
    initialData,
    VALIDATION_RULES.EXAM_CREATION,
    {
      title: SANITIZATION_RULES.TEXT_INPUT,
      description: SANITIZATION_RULES.TEXT_AREA
    }
  );
};

export const useQuestionForm = (initialData = {}) => {
  return useFormValidation(
    initialData,
    VALIDATION_RULES.QUESTION_CREATION,
    {
      text: SANITIZATION_RULES.TEXT_AREA,
      options: SANITIZATION_RULES.TEXT_INPUT
    }
  );
};

export const useInstitutionForm = (initialData = {}) => {
  return useFormValidation(
    initialData,
    VALIDATION_RULES.INSTITUTION_CREATION,
    {
      name: SANITIZATION_RULES.TEXT_INPUT,
      slug: SANITIZATION_RULES.USERNAME,
      description: SANITIZATION_RULES.TEXT_AREA,
      website: SANITIZATION_RULES.TEXT_INPUT
    }
  );
};

export default useFormValidation;

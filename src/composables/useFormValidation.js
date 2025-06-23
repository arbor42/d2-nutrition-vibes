import { ref, computed, watch, reactive } from 'vue'
import { useForm, useField, configure } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

import { useErrorHandling } from './useErrorHandling'

import { 
  searchFormSchema, 
  exportFormSchema, 
  userPreferencesSchema,
  validateData 
} from '@/schemas/validation'

// Configure VeeValidate
configure({
  generateMessage: (context) => {
    const messages = {
      required: `${context.field} is required`,
      email: `${context.field} must be a valid email`,
      min: `${context.field} must be at least ${context.rule.params} characters`,
      max: `${context.field} must be at most ${context.rule.params} characters`,
      numeric: `${context.field} must be a number`,
      integer: `${context.field} must be an integer`,
      url: `${context.field} must be a valid URL`,
      between: `${context.field} must be between ${context.rule.params[0]} and ${context.rule.params[1]}`,
      confirmed: `${context.field} confirmation does not match`
    }
    
    return messages[context.rule.name] || `${context.field} is invalid`
  },
  validateOnBlur: true,
  validateOnChange: false,
  validateOnInput: false,
  validateOnModelUpdate: true
})

// Enhanced form validation composable for Phase 5
export function useFormValidation(schema = {}, options = {}) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
    showErrorsImmediately = false
  } = options

  const { handleError } = useErrorHandling()

  // Form state
  const formData = ref({})
  const errors = ref({})
  const touched = ref({})
  const validating = ref({})
  const isSubmitting = ref(false)
  const hasBeenSubmitted = ref(false)

  // Validation rules
  const validationRules = reactive(schema)

  // Computed properties
  const isValid = computed(() => Object.keys(errors.value).length === 0)
  const hasErrors = computed(() => Object.keys(errors.value).length > 0)
  const isDirty = computed(() => Object.keys(touched.value).length > 0)
  const isValidating = computed(() => Object.values(validating.value).some(Boolean))

  // Field-specific computed properties
  const getFieldError = (fieldName) => {
    return computed(() => errors.value[fieldName])
  }

  const isFieldValid = (fieldName) => {
    return computed(() => !errors.value[fieldName])
  }

  const isFieldTouched = (fieldName) => {
    return computed(() => touched.value[fieldName])
  }

  const shouldShowFieldError = (fieldName) => {
    return computed(() => {
      if (showErrorsImmediately) return !!errors.value[fieldName]
      return touched.value[fieldName] && errors.value[fieldName]
    })
  }

  // Built-in validation rules
  const builtInRules = {
    required: (value, message = 'This field is required') => {
      if (value === null || value === undefined || value === '') {
        return message
      }
      return null
    },

    email: (value, message = 'Please enter a valid email address') => {
      if (!value) return null
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value) ? null : message
    },

    minLength: (minLen, message) => (value) => {
      if (!value) return null
      const actualMessage = message || `Must be at least ${minLen} characters`
      return value.length >= minLen ? null : actualMessage
    },

    maxLength: (maxLen, message) => (value) => {
      if (!value) return null
      const actualMessage = message || `Must be no more than ${maxLen} characters`
      return value.length <= maxLen ? null : actualMessage
    },

    min: (minVal, message) => (value) => {
      if (value === null || value === undefined || value === '') return null
      const numValue = Number(value)
      if (isNaN(numValue)) return 'Must be a valid number'
      const actualMessage = message || `Must be at least ${minVal}`
      return numValue >= minVal ? null : actualMessage
    },

    max: (maxVal, message) => (value) => {
      if (value === null || value === undefined || value === '') return null
      const numValue = Number(value)
      if (isNaN(numValue)) return 'Must be a valid number'
      const actualMessage = message || `Must be no more than ${maxVal}`
      return numValue <= maxVal ? null : actualMessage
    },

    pattern: (regex, message = 'Invalid format') => (value) => {
      if (!value) return null
      const pattern = typeof regex === 'string' ? new RegExp(regex) : regex
      return pattern.test(value) ? null : message
    },

    numeric: (value, message = 'Must be a valid number') => {
      if (!value) return null
      return !isNaN(Number(value)) ? null : message
    },

    integer: (value, message = 'Must be a whole number') => {
      if (!value) return null
      const num = Number(value)
      return Number.isInteger(num) ? null : message
    },

    url: (value, message = 'Please enter a valid URL') => {
      if (!value) return null
      try {
        new URL(value)
        return null
      } catch {
        return message
      }
    },

    date: (value, message = 'Please enter a valid date') => {
      if (!value) return null
      const date = new Date(value)
      return !isNaN(date.getTime()) ? null : message
    },

    custom: (validatorFn, message = 'Invalid value') => (value) => {
      if (!value) return null
      try {
        const result = validatorFn(value)
        return result === true ? null : (typeof result === 'string' ? result : message)
      } catch (error) {
        return message
      }
    },

    // Complex validation rules
    passwordStrength: (value, options = {}) => {
      if (!value) return null
      
      const {
        minLength = 8,
        requireUppercase = true,
        requireLowercase = true,
        requireNumbers = true,
        requireSpecialChars = false
      } = options

      const errors = []

      if (value.length < minLength) {
        errors.push(`at least ${minLength} characters`)
      }

      if (requireUppercase && !/[A-Z]/.test(value)) {
        errors.push('at least one uppercase letter')
      }

      if (requireLowercase && !/[a-z]/.test(value)) {
        errors.push('at least one lowercase letter')
      }

      if (requireNumbers && !/\d/.test(value)) {
        errors.push('at least one number')
      }

      if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        errors.push('at least one special character')
      }

      return errors.length > 0 
        ? `Password must contain ${errors.join(', ')}`
        : null
    },

    confirmPassword: (passwordField) => (value) => {
      if (!value) return null
      const password = formData.value[passwordField]
      return value === password ? null : 'Passwords do not match'
    },

    fileSize: (maxSizeBytes, message) => (file) => {
      if (!file) return null
      const actualMessage = message || `File size must be less than ${formatBytes(maxSizeBytes)}`
      return file.size <= maxSizeBytes ? null : actualMessage
    },

    fileType: (allowedTypes, message) => (file) => {
      if (!file) return null
      const actualMessage = message || `File type must be one of: ${allowedTypes.join(', ')}`
      return allowedTypes.includes(file.type) ? null : actualMessage
    }
  }

  // Validate single field
  const validateField = async (fieldName, value = formData.value[fieldName]) => {
    const rules = validationRules[fieldName]
    if (!rules) return null

    validating.value[fieldName] = true

    try {
      const ruleArray = Array.isArray(rules) ? rules : [rules]
      
      for (const rule of ruleArray) {
        let validator
        let message

        if (typeof rule === 'function') {
          validator = rule
        } else if (typeof rule === 'object' && rule.validator) {
          validator = rule.validator
          message = rule.message
        } else if (typeof rule === 'string' && builtInRules[rule]) {
          validator = builtInRules[rule]
        } else {
          continue
        }

        const result = await validator(value, message)
        if (result) {
          errors.value[fieldName] = result
          return result
        }
      }

      // Clear error if validation passes
      if (errors.value[fieldName]) {
        delete errors.value[fieldName]
      }
      
      return null
    } catch (error) {
      const errorMessage = `Validation error for ${fieldName}: ${error.message}`
      errors.value[fieldName] = errorMessage
      handleError(error, {
        component: 'form-validation',
        action: 'validate-field',
        field: fieldName
      })
      return errorMessage
    } finally {
      validating.value[fieldName] = false
    }
  }

  // Validate all fields
  const validateForm = async () => {
    const fieldNames = Object.keys(validationRules)
    const validationPromises = fieldNames.map(fieldName => validateField(fieldName))
    
    await Promise.all(validationPromises)
    return isValid.value
  }

  // Set field value with validation
  const setFieldValue = async (fieldName, value) => {
    formData.value[fieldName] = value
    
    if (validateOnChange && (touched.value[fieldName] || hasBeenSubmitted.value)) {
      await validateField(fieldName, value)
    }
  }

  // Handle field blur
  const handleFieldBlur = async (fieldName) => {
    touched.value[fieldName] = true
    
    if (validateOnBlur) {
      await validateField(fieldName)
    }
  }

  // Handle field change
  const handleFieldChange = async (fieldName, value) => {
    await setFieldValue(fieldName, value)
  }

  // Handle form submission
  const handleSubmit = async (submitFn) => {
    hasBeenSubmitted.value = true
    isSubmitting.value = true

    try {
      // Mark all fields as touched
      Object.keys(validationRules).forEach(fieldName => {
        touched.value[fieldName] = true
      })

      // Validate all fields
      const isFormValid = await validateForm()
      
      if (!isFormValid) {
        return { success: false, errors: errors.value }
      }

      // Execute submit function
      const result = await submitFn(formData.value)
      
      return { success: true, data: result }
    } catch (error) {
      handleError(error, {
        component: 'form-validation',
        action: 'submit-form'
      })
      return { success: false, error: error.message }
    } finally {
      isSubmitting.value = false
    }
  }

  // Reset form
  const resetForm = () => {
    formData.value = {}
    errors.value = {}
    touched.value = {}
    validating.value = {}
    isSubmitting.value = false
    hasBeenSubmitted.value = false
  }

  // Reset field
  const resetField = (fieldName) => {
    delete formData.value[fieldName]
    delete errors.value[fieldName]
    delete touched.value[fieldName]
    delete validating.value[fieldName]
  }

  // Set form data
  const setFormData = (data) => {
    formData.value = { ...data }
  }

  // Add validation rule
  const addRule = (fieldName, rule) => {
    if (!validationRules[fieldName]) {
      validationRules[fieldName] = []
    }
    
    if (Array.isArray(validationRules[fieldName])) {
      validationRules[fieldName].push(rule)
    } else {
      validationRules[fieldName] = [validationRules[fieldName], rule]
    }
  }

  // Remove validation rule
  const removeRule = (fieldName, ruleIndex = null) => {
    if (ruleIndex === null) {
      delete validationRules[fieldName]
    } else if (Array.isArray(validationRules[fieldName])) {
      validationRules[fieldName].splice(ruleIndex, 1)
      if (validationRules[fieldName].length === 0) {
        delete validationRules[fieldName]
      }
    }
  }

  // Debounced validation
  const validationTimeouts = {}
  
  const debouncedValidateField = (fieldName, value) => {
    clearTimeout(validationTimeouts[fieldName])
    validationTimeouts[fieldName] = setTimeout(() => {
      validateField(fieldName, value)
    }, debounceMs)
  }

  // Watch for form data changes with debounced validation
  if (validateOnChange) {
    watch(formData, (newData, oldData) => {
      Object.keys(newData).forEach(fieldName => {
        if (newData[fieldName] !== oldData?.[fieldName] && 
            (touched.value[fieldName] || hasBeenSubmitted.value)) {
          debouncedValidateField(fieldName, newData[fieldName])
        }
      })
    }, { deep: true })
  }

  // Helper function to format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  // Create field helpers
  const createFieldHelpers = (fieldName) => {
    return {
      value: computed({
        get: () => formData.value[fieldName],
        set: (value) => setFieldValue(fieldName, value)
      }),
      error: getFieldError(fieldName),
      isValid: isFieldValid(fieldName),
      isTouched: isFieldTouched(fieldName),
      showError: shouldShowFieldError(fieldName),
      validate: () => validateField(fieldName),
      reset: () => resetField(fieldName),
      onBlur: () => handleFieldBlur(fieldName),
      onChange: (value) => handleFieldChange(fieldName, value)
    }
  }

  return {
    // Form state
    formData,
    errors,
    touched,
    validating,
    isSubmitting,
    hasBeenSubmitted,
    
    // Computed properties
    isValid,
    hasErrors,
    isDirty,
    isValidating,
    
    // Field helpers
    getFieldError,
    isFieldValid,
    isFieldTouched,
    shouldShowFieldError,
    createFieldHelpers,
    
    // Actions
    validateField,
    validateForm,
    setFieldValue,
    handleFieldBlur,
    handleFieldChange,
    handleSubmit,
    resetForm,
    resetField,
    setFormData,
    
    // Rule management
    addRule,
    removeRule,
    
    // Built-in rules (for reference)
    rules: builtInRules
  }
}

// VeeValidate + Zod integration composable
export function useVeeValidateForm(schema, options = {}) {
  const {
    initialValues = {},
    validateOnMount = false,
    resetOnSubmit = false,
    keepValuesOnReset = false
  } = options

  // Convert Zod schema to VeeValidate schema
  const validationSchema = schema ? toTypedSchema(schema) : undefined

  // Create form with VeeValidate
  const form = useForm({
    validationSchema,
    initialValues,
    keepValuesOnReset,
    validateOnMount
  })

  // Form state
  const { 
    values, 
    errors, 
    isSubmitting, 
    submitCount, 
    meta,
    setFieldValue,
    setValues,
    resetForm,
    handleSubmit,
    validate
  } = form

  // Computed properties
  const isValid = computed(() => meta.value.valid)
  const isDirty = computed(() => meta.value.dirty)
  const isTouched = computed(() => meta.value.touched)
  const hasErrors = computed(() => Object.keys(errors.value).length > 0)

  // Enhanced submit handler
  const onSubmit = handleSubmit(async (values, { setErrors, setFieldError }) => {
    try {
      // Additional validation if needed
      if (schema) {
        const validation = validateData(schema, values)
        if (!validation.success) {
          const formErrors = {}
          validation.errors.forEach(error => {
            const field = error.path ? error.path.join('.') : 'root'
            formErrors[field] = error.message
          })
          setErrors(formErrors)
          return
        }
      }

      // Submit form
      if (options.onSubmit) {
        await options.onSubmit(values, form)
      }

      // Reset form if option is enabled
      if (resetOnSubmit) {
        resetForm()
      }

    } catch (error) {
      console.error('Form submission error:', error)
      
      // Handle API errors
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else if (error.message) {
        setFieldError('root', error.message)
      } else {
        setFieldError('root', 'An unexpected error occurred')
      }
    }
  })

  return {
    // VeeValidate form object
    form,
    
    // Form state
    values,
    errors,
    isSubmitting,
    submitCount,
    meta,
    
    // Computed properties
    isValid,
    isDirty,
    isTouched,
    hasErrors,
    
    // Form methods
    setFieldValue,
    setValues,
    resetForm,
    validate,
    onSubmit
  }
}

// Pre-configured form composables for common forms
export function useSearchForm(initialValues = {}, options = {}) {
  return useVeeValidateForm(searchFormSchema, {
    initialValues: {
      query: '',
      filters: {
        countries: [],
        items: [],
        years: {
          start: new Date().getFullYear() - 10,
          end: new Date().getFullYear()
        }
      },
      ...initialValues
    },
    ...options
  })
}

export function useExportForm(initialValues = {}, options = {}) {
  return useVeeValidateForm(exportFormSchema, {
    initialValues: {
      format: 'csv',
      data_type: 'production',
      filters: {
        countries: [],
        years: {
          start: new Date().getFullYear() - 5,
          end: new Date().getFullYear()
        },
        items: []
      },
      ...initialValues
    },
    ...options
  })
}
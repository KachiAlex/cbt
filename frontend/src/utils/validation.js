// Input validation and sanitization utilities

// Common validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  USERNAME: /^[a-zA-Z0-9._-]{3,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
  ALPHABETIC: /^[a-zA-Z\s]+$/,
  NUMERIC: /^\d+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SLUG: /^[a-z0-9-]+$/
};

// Input length limits
export const INPUT_LIMITS = {
  USERNAME: { min: 3, max: 20 },
  PASSWORD: { min: 8, max: 128 },
  FULL_NAME: { min: 2, max: 50 },
  EMAIL: { max: 254 },
  PHONE: { max: 20 },
  EXAM_TITLE: { min: 3, max: 100 },
  QUESTION_TEXT: { min: 10, max: 1000 },
  OPTION_TEXT: { min: 1, max: 200 },
  INSTITUTION_NAME: { min: 3, max: 100 },
  DESCRIPTION: { max: 500 }
};

// Sanitization functions
export const sanitizeInput = {
  // Remove HTML tags and dangerous characters
  html: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },

  // Remove SQL injection patterns
  sql: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/('|(\\')|(;)|(\-\-)|(\/\*)|(\*\/)|(\|)|(\*)|(\%)|(\+)|(\=)|(\<)|(\>)|(\[)|(\])|(\{)|(\})|(\()|(\))|(\^)|(\$)|(\!)|(\@)|(\#)|(\&)|(\~)|(\`)|(\\)/g, '')
      .trim();
  },

  // Basic text sanitization
  text: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>\"'&]/g, (match) => {
        const escapeMap = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return escapeMap[match];
      })
      .trim();
  },

  // Remove extra whitespace
  whitespace: (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/\s+/g, ' ').trim();
  },

  // Convert to lowercase
  lowercase: (input) => {
    if (typeof input !== 'string') return input;
    return input.toLowerCase();
  },

  // Convert to uppercase
  uppercase: (input) => {
    if (typeof input !== 'string') return input;
    return input.toUpperCase();
  }
};

// Validation functions
export const validateInput = {
  // Required field validation
  required: (value, fieldName = 'Field') => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  // Length validation
  length: (value, min, max, fieldName = 'Field') => {
    if (typeof value !== 'string') return null;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters long`;
    }
    if (value.length > max) {
      return `${fieldName} must be no more than ${max} characters long`;
    }
    return null;
  },

  // Pattern validation
  pattern: (value, pattern, errorMessage, fieldName = 'Field') => {
    if (typeof value !== 'string') return null;
    if (!pattern.test(value)) {
      return errorMessage || `${fieldName} format is invalid`;
    }
    return null;
  },

  // Email validation
  email: (value) => {
    return validateInput.pattern(
      value, 
      VALIDATION_PATTERNS.EMAIL, 
      'Please enter a valid email address',
      'Email'
    );
  },

  // Username validation
  username: (value) => {
    const required = validateInput.required(value, 'Username');
    if (required) return required;

    const length = validateInput.length(value, INPUT_LIMITS.USERNAME.min, INPUT_LIMITS.USERNAME.max, 'Username');
    if (length) return length;

    const pattern = validateInput.pattern(
      value, 
      VALIDATION_PATTERNS.USERNAME, 
      'Username can only contain letters, numbers, dots, underscores, and hyphens',
      'Username'
    );
    if (pattern) return pattern;

    // Check for reserved usernames
    const reservedUsernames = ['admin', 'administrator', 'root', 'superadmin', 'system', 'test', 'user', 'guest'];
    if (reservedUsernames.includes(value.toLowerCase())) {
      return 'This username is reserved and cannot be used';
    }

    return null;
  },

  // Password validation
  password: (value) => {
    const required = validateInput.required(value, 'Password');
    if (required) return required;

    const length = validateInput.length(value, INPUT_LIMITS.PASSWORD.min, INPUT_LIMITS.PASSWORD.max, 'Password');
    if (length) return length;

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', '123456789', 'qwerty', 'abc123', 'password123', 'admin', 'letmein'];
    if (weakPasswords.includes(value.toLowerCase())) {
      return 'This password is too common. Please choose a stronger password';
    }

    // Check password strength
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[@$!%*?&]/.test(value);

    if (!hasLower || !hasUpper || !hasNumber) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    return null;
  },

  // Full name validation
  fullName: (value) => {
    const required = validateInput.required(value, 'Full name');
    if (required) return required;

    const length = validateInput.length(value, INPUT_LIMITS.FULL_NAME.min, INPUT_LIMITS.FULL_NAME.max, 'Full name');
    if (length) return length;

    const pattern = validateInput.pattern(
      value, 
      VALIDATION_PATTERNS.ALPHABETIC, 
      'Full name can only contain letters and spaces',
      'Full name'
    );
    if (pattern) return pattern;

    // Check for multiple consecutive spaces
    if (/\s{2,}/.test(value)) {
      return 'Full name cannot contain multiple consecutive spaces';
    }

    return null;
  },

  // Phone validation
  phone: (value) => {
    if (!value) return null; // Phone is optional

    const length = validateInput.length(value, 10, INPUT_LIMITS.PHONE.max, 'Phone number');
    if (length) return length;

    const pattern = validateInput.pattern(
      value, 
      VALIDATION_PATTERNS.PHONE, 
      'Please enter a valid phone number',
      'Phone number'
    );
    if (pattern) return pattern;

    return null;
  },

  // Exam title validation
  examTitle: (value) => {
    const required = validateInput.required(value, 'Exam title');
    if (required) return required;

    const length = validateInput.length(value, INPUT_LIMITS.EXAM_TITLE.min, INPUT_LIMITS.EXAM_TITLE.max, 'Exam title');
    if (length) return length;

    return null;
  },

  // Question text validation
  questionText: (value) => {
    const required = validateInput.required(value, 'Question text');
    if (required) return required;

    const length = validateInput.length(value, INPUT_LIMITS.QUESTION_TEXT.min, INPUT_LIMITS.QUESTION_TEXT.max, 'Question text');
    if (length) return length;

    return null;
  },

  // Option text validation
  optionText: (value) => {
    const required = validateInput.required(value, 'Option text');
    if (required) return required;

    const length = validateInput.length(value, INPUT_LIMITS.OPTION_TEXT.min, INPUT_LIMITS.OPTION_TEXT.max, 'Option text');
    if (length) return length;

    return null;
  },

  // Institution name validation
  institutionName: (value) => {
    const required = validateInput.required(value, 'Institution name');
    if (required) return required;

    const length = validateInput.length(value, INPUT_LIMITS.INSTITUTION_NAME.min, INPUT_LIMITS.INSTITUTION_NAME.max, 'Institution name');
    if (length) return length;

    return null;
  },

  // URL validation
  url: (value) => {
    if (!value) return null; // URL is optional

    const pattern = validateInput.pattern(
      value, 
      VALIDATION_PATTERNS.URL, 
      'Please enter a valid URL',
      'URL'
    );
    if (pattern) return pattern;

    return null;
  },

  // Slug validation
  slug: (value) => {
    const required = validateInput.required(value, 'Slug');
    if (required) return required;

    const pattern = validateInput.pattern(
      value, 
      VALIDATION_PATTERNS.SLUG, 
      'Slug can only contain lowercase letters, numbers, and hyphens',
      'Slug'
    );
    if (pattern) return pattern;

    return null;
  }
};

// Form validation helper
export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  for (const [field, rules] of Object.entries(validationRules)) {
    const value = formData[field];
    
    for (const rule of rules) {
      const error = rule(value);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Sanitize form data
export const sanitizeFormData = (formData, sanitizationRules) => {
  const sanitized = {};
  
  for (const [field, rules] of Object.entries(sanitizationRules)) {
    let value = formData[field];
    
    for (const rule of rules) {
      value = rule(value);
    }
    
    sanitized[field] = value;
  }
  
  return sanitized;
};

// Common validation rule sets
export const VALIDATION_RULES = {
  USER_REGISTRATION: {
    username: [validateInput.username],
    password: [validateInput.password],
    fullName: [validateInput.fullName],
    email: [validateInput.email],
    phone: [validateInput.phone]
  },
  
  USER_LOGIN: {
    username: [validateInput.required],
    password: [validateInput.required]
  },
  
  EXAM_CREATION: {
    title: [validateInput.examTitle],
    description: [validateInput.length.bind(null, null, 0, INPUT_LIMITS.DESCRIPTION.max)]
  },
  
  QUESTION_CREATION: {
    text: [validateInput.questionText],
    options: [(value) => {
      if (!Array.isArray(value) || value.length < 2) {
        return 'At least 2 options are required';
      }
      return null;
    }],
    correctAnswer: [validateInput.required]
  },
  
  INSTITUTION_CREATION: {
    name: [validateInput.institutionName],
    slug: [validateInput.slug],
    description: [validateInput.length.bind(null, null, 0, INPUT_LIMITS.DESCRIPTION.max)],
    website: [validateInput.url]
  }
};

// Common sanitization rule sets
export const SANITIZATION_RULES = {
  TEXT_INPUT: {
    html: [sanitizeInput.html],
    whitespace: [sanitizeInput.whitespace]
  },
  
  USERNAME: {
    lowercase: [sanitizeInput.lowercase],
    html: [sanitizeInput.html],
    whitespace: [sanitizeInput.whitespace]
  },
  
  EMAIL: {
    lowercase: [sanitizeInput.lowercase],
    html: [sanitizeInput.html],
    whitespace: [sanitizeInput.whitespace]
  },
  
  FULL_NAME: {
    html: [sanitizeInput.html],
    whitespace: [sanitizeInput.whitespace]
  },
  
  TEXT_AREA: {
    html: [sanitizeInput.html],
    whitespace: [sanitizeInput.whitespace]
  }
};

export default {
  VALIDATION_PATTERNS,
  INPUT_LIMITS,
  sanitizeInput,
  validateInput,
  validateForm,
  sanitizeFormData,
  VALIDATION_RULES,
  SANITIZATION_RULES
};

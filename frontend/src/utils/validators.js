export const rules = {
  required: (label = 'This field') => ({
    required: `${label} is required`,
  }),

  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Enter a valid email address',
    },
  },

  phone: {
    required: 'Phone number is required',
    pattern: {
      value: /^\+?[0-9]{10,15}$/,
      message: 'Enter a valid phone number (10–15 digits)',
    },
  },

  password: {
    required: 'Password is required',
    minLength: { value: 8, message: 'Password must be at least 8 characters' },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
      message: 'Must contain uppercase, lowercase, digit and special character',
    },
  },

  otp: {
    required: 'OTP is required',
    pattern: {
      value: /^[0-9]{6}$/,
      message: 'OTP must be exactly 6 digits',
    },
  },

  positiveNumber: (label = 'Value') => ({
    required: `${label} is required`,
    min: { value: 1, message: `${label} must be at least 1` },
  }),
};
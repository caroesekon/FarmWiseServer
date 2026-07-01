const { validateRequired, isValidEmail, isValidKenyanPhone } = require('../../utils/validators');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];

    if (schema.required) {
      const missing = validateRequired(req.body, schema.required);
      if (missing.length > 0) {
        errors.push(`Missing required fields: ${missing.join(', ')}`);
      }
    }

    if (schema.rules) {
      for (const [field, rules] of Object.entries(schema.rules)) {
        const value = req.body[field];

        if (value === undefined || value === null) continue;

        if (rules.isEmail && !isValidEmail(value)) {
          errors.push(`${field} must be a valid email address`);
        }

        if (rules.isPhone && !isValidKenyanPhone(value)) {
          errors.push(`${field} must be a valid Kenyan phone number`);
        }

        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }

        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }

        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    next();
  };
};

module.exports = validateRequest;
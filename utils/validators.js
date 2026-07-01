/**
 * Validates email format
 */
const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates Kenyan phone number
 * Accepts: +254712345678, 254712345678, 0712345678, 712345678
 */
const isValidKenyanPhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^(\+?254|0)?[71]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Normalizes phone to +254 format
 */
const normalizePhone = (phone) => {
  if (!phone) return null;
  let cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+254' + cleaned;
  }
  return cleaned;
};

/**
 * Validates required fields in request body
 * Returns array of missing fields
 */
const validateRequired = (body, requiredFields) => {
  const missing = [];
  for (const field of requiredFields) {
    if (!body[field] && body[field] !== 0 && body[field] !== false) {
      missing.push(field);
    }
  }
  return missing;
};

/**
 * Validates ObjectId format
 */
const isValidObjectId = (id) => {
  if (!id) return false;
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

/**
 * Validates date string
 */
const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};

/**
 * Sanitizes string input (basic)
 */
const sanitize = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.trim().replace(/<[^>]*>/g, '');
};

module.exports = {
  isValidEmail,
  isValidKenyanPhone,
  normalizePhone,
  validateRequired,
  isValidObjectId,
  isValidDate,
  sanitize,
};
const crypto = require('crypto');

/**
 * Generates a secure temporary password for new users
 * Default: 12 characters, mixed case, numbers, special chars
 */
const generatePassword = (length = 12) => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluded I, O (ambiguous)
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';   // Excluded i, l, o
  const numbers = '23456789';                     // Excluded 0, 1
  const symbols = '!@#$%&*_-';

  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least one from each category
  const password = [
    uppercase[crypto.randomInt(uppercase.length)],
    lowercase[crypto.randomInt(lowercase.length)],
    numbers[crypto.randomInt(numbers.length)],
    symbols[crypto.randomInt(symbols.length)],
  ];

  // Fill remaining with random from all characters
  for (let i = password.length; i < length; i++) {
    password.push(allChars[crypto.randomInt(allChars.length)]);
  }

  // Shuffle the array
  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
};

module.exports = generatePassword;
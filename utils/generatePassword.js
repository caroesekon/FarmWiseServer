const crypto = require('crypto');

/**
 * Generates a secure temporary password
 * Avoids ambiguous characters: I, l, O, 0
 * Avoids shell-unfriendly characters: $, !, ", '
 * Default: 12 characters, mixed case, numbers
 */
const generatePassword = (length = 12) => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '@#%&*_-';

  const allChars = uppercase + lowercase + numbers + symbols;

  const password = [
    uppercase[crypto.randomInt(uppercase.length)],
    lowercase[crypto.randomInt(lowercase.length)],
    numbers[crypto.randomInt(numbers.length)],
    symbols[crypto.randomInt(symbols.length)],
  ];

  for (let i = password.length; i < length; i++) {
    password.push(allChars[crypto.randomInt(allChars.length)]);
  }

  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
};

module.exports = generatePassword;
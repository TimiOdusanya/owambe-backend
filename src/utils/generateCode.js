const crypto = require('crypto');

const generateEventCode = () => {
  return crypto.randomBytes(4).toString('hex'); // 8 characters
};

module.exports = generateEventCode;

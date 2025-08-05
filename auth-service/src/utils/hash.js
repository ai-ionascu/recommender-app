import bcrypt from 'bcryptjs';

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

export const hashPassword = (plainPassword) => {
  return bcrypt.hash(plainPassword, saltRounds);
};

export const comparePasswords = (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

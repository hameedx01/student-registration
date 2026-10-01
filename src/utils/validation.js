const UINT256_MAX = (1n << 256n) - 1n;

export function validateRegistration({ name, age, course }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter your full name.';
  if (!/^\d+$/.test(age.trim())) errors.age = 'Enter your age as a whole, nonnegative number.';
  else if (BigInt(age.trim()) > UINT256_MAX) errors.age = 'This age is too large for the contract.';
  if (!course.trim()) errors.course = 'Enter your course of study.';
  return errors;
}

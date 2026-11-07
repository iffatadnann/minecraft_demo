import { AppError } from '../utils/AppError.js';

// Checks req.body against a Zod schema and replaces it with the cleaned data.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', details);
  }
  req.body = result.data;
  next();
};
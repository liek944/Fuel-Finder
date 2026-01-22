/**
 * Authentication Schemas
 * Zod validation schemas for auth endpoints
 */

const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Invalid email format")
      .max(255, "Email too long"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password too long"),
    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(100, "Display name too long")
      .optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Invalid email format"),
    password: z
      .string()
      .min(1, "Password is required"),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
};

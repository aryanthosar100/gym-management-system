import { z } from "zod";

export const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  // optional plan name (case-insensitive): Basic, Premium, Pro (or any you have in DB)
  plan: z.string().trim().min(1).optional()
});

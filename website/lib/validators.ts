import { z } from 'zod';

export const inquirySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  company: z.string().min(2).max(200),
  role: z.string().min(2).max(100),
  interest: z.enum(['assessment', 'pilot', 'enablement', 'other']),
  message: z.string().min(10).max(2000),
  // Honeypot field should remain empty
  website: z.string().optional().transform(v => v?.trim() ?? '')
});
export type Inquiry = z.infer<typeof inquirySchema>;



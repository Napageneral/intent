import { Resend } from 'resend';

export async function sendInquiryEmail(payload: {
  to: string;
  cc?: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set');

  const resend = new Resend(apiKey);
  const from = 'Intent Systems <noreply@intent-systems.com>'; // set up a verified sender

  const response = await resend.emails.send({
    from,
    to: [payload.to],
    cc: payload.cc ? [payload.cc] : undefined,
    subject: payload.subject,
    text: payload.text
  });

  if ('error' in response && response.error) {
    throw new Error(response.error.message);
  }
  return response;
}



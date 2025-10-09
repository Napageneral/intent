import { NextRequest, NextResponse } from 'next/server';
import { inquirySchema } from '@/lib/validators';
import { sendInquiryEmail } from '@/lib/email';

export const runtime = 'nodejs'; // email needs Node.js runtime on Vercel

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const parsed = inquirySchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }

    // honeypot
    if (parsed.data.website && parsed.data.website.length > 0) {
      return NextResponse.json({ ok: true }); // silently drop bots
    }

    const recipient = process.env.CONTACT_RECIPIENT || 'hello@intent-systems.com';
    const cc = process.env.CONTACT_CC || '';

    const { name, email, company, role, interest, message } = parsed.data;

    const subject = `New inquiry (${interest}) — ${company} / ${name}`;
    const text = [
      `Name:    ${name}`,
      `Email:   ${email}`,
      `Company: ${company}`,
      `Role:    ${role}`,
      `Interest: ${interest}`,
      '',
      'Message:',
      message
    ].join('\n');

    await sendInquiryEmail({ to: recipient, cc: cc || undefined, subject, text });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? 'Internal error' }, { status: 500 });
  }
}



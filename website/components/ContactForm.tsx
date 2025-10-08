'use client';

import { useState } from 'react';

const interests = [
  { value: 'assessment', label: 'Agent Effectiveness Assessment' },
  { value: 'pilot', label: 'Pilot Modernization Sprint' },
  { value: 'enablement', label: 'Scale-out & Enablement' },
  { value: 'other', label: 'Other' }
];

export default function ContactForm() {
  const [status, setStatus] = useState<'idle'|'submitting'|'success'|'error'>('idle');
  const [error, setError] = useState<string>('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting'); setError('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData) as Record<string, string>;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || json.ok !== true) throw new Error(json.error || 'Failed to send');
      setStatus('success');
      form.reset();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      setStatus('error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-800">Name</label>
          <input name="name" required placeholder="Jane Doe"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800">Work Email</label>
          <input type="email" name="email" required placeholder="jane@company.com"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-800">Company</label>
          <input name="company" required placeholder="Acme Corp"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800">Role</label>
          <input name="role" required placeholder="VP Engineering"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800">Interest</label>
        <select name="interest" defaultValue="assessment"
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:border-brand-500 focus:ring-brand-500">
          {interests.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800">
          What are you hoping to accomplish?
        </label>
        <textarea name="message" required rows={5} placeholder="Give us context on your legacy stack, where agents stall today, and the KPIs you care about."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
      </div>

      {/* Honeypot */}
      <div className="hidden">
        <label>Website</label>
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand-500 md:w-auto"
      >
        {status === 'submitting' ? 'Sending…' : 'Request the Assessment'}
      </button>

      {status === 'success' && (
        <p className="text-sm text-green-700">Thanks—your inquiry is in. We'll reply shortly.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-700">Couldn't send: {error}</p>
      )}
    </form>
  );
}


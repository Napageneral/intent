import { useState } from 'react';

export default function Onboarding() {
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState<'welcome' | 'scan' | 'questions' | 'review'>('welcome');
  
  const startScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/onboard/scan', { method: 'POST' });
      const data = await res.json();
      console.log('Scan complete:', data);
      setStep('questions');
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed. Check console for details.');
    } finally {
      setScanning(false);
    }
  };
  
  return (
    <div className="container">
      <div className="page-header">
        <h1>Onboarding Wizard</h1>
        <p>Bootstrap Intent in your codebase</p>
      </div>
      
      {step === 'welcome' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Welcome to Intent Onboarding</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            This wizard will help you:
          </p>
          <ul style={{ textAlign: 'left', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 2 }}>
            <li>📊 Scan your project for directories needing guides</li>
            <li>❓ Generate question packs to capture context</li>
            <li>✍️ Answer questions about each area</li>
            <li>🤖 Synthesize draft agents.md files with Claude</li>
            <li>✅ Review, accept, and commit</li>
          </ul>
          <button 
            className="btn btn-primary"
            style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            onClick={() => setStep('scan')}
          >
            Get Started
          </button>
        </div>
      )}
      
      {step === 'scan' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Scan Project</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Intent will scan your repository to identify directories that would benefit from engineering guides.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            We look for routes, workers, services, schemas, and other patterns indicating complexity.
          </p>
          <button 
            className="btn btn-primary"
            onClick={startScan}
            disabled={scanning}
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {scanning ? 'Scanning...' : 'Start Scan'}
          </button>
        </div>
      )}
      
      {step === 'questions' && (
        <div className="card" style={{ maxWidth: '700px', margin: '0 auto', padding: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>✅ Scan Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Question packs have been generated in <code style={{ background: 'var(--bg-tertiary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>.intent/questions/</code>
          </p>
          <div className="card" style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Next Steps (Manual)</h3>
            <ol style={{ color: 'var(--text-secondary)', lineHeight: 2 }}>
              <li>Open <code>.intent/questions/*.md</code> in your editor</li>
              <li>Answer the questions (fill in after the "→" markers)</li>
              <li>Return here and click "Synthesize Drafts"</li>
            </ol>
          </div>
          <button 
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
            onClick={() => alert('Not yet implemented - use CLI: intent synthesize')}
          >
            Synthesize Drafts (Coming Soon)
          </button>
        </div>
      )}
    </div>
  );
}


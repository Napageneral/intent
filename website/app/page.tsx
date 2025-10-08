import Logo from '@/components/Logo';
import SectionHeading from '@/components/SectionHeading';
import FeatureCard from '@/components/FeatureCard';
import MetricCard from '@/components/MetricCard';
import ContactForm from '@/components/ContactForm';
import PrimaryButton from '@/components/PrimaryButton';

export default function Page() {
  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl container-px flex h-14 items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
            <a href="#how" className="hover:text-gray-900">How it works</a>
            <a href="#outcomes" className="hover:text-gray-900">Outcomes</a>
            <a href="#install" className="hover:text-gray-900">What we install</a>
            <a href="#security" className="hover:text-gray-900">Security</a>
          </nav>
          <PrimaryButton href="#contact" className="hidden md:inline-flex">Get the Assessment</PrimaryButton>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-brand-50" />
        <div className="mx-auto max-w-6xl container-px py-20 md:py-28 relative">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-gray-900">
                Make AI effective on your <span className="text-brand-600">legacy code</span>.
              </h1>
              <p className="mt-4 text-lg text-gray-700">
                We turn your codebase into <strong>agent‑ready context</strong>—and train your teams to keep it that way.
                In 30 days, agents go from guessing to shipping safe changes your leads would approve.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <PrimaryButton href="#contact">Request the Assessment</PrimaryButton>
                <a href="#how" className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  How it works
                </a>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:max-w-md">
                <MetricCard metric="+40–70" label="AES improvement (pilot)" />
                <MetricCard metric="–30%" label="Lead time to merge" />
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl bg-white p-6 shadow-card border border-gray-100">
                <div className="bg-grid rounded-lg p-6">
                  <div className="text-sm font-mono text-gray-700">
                    <div className="text-gray-900 font-semibold mb-2">Map → Guide → Verify</div>
                    <pre className="whitespace-pre-wrap">
                      {`// agents.md (feature/dir scope)
What lives here
Golden path
Invariants
Signals (logs/metrics)
Pitfalls & links`}
                    </pre>
                  </div>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 hidden md:block h-24 w-24 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 blur-2xl opacity-30" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl container-px">
          <SectionHeading
            eyebrow="How it works"
            title="Map → Guide → Verify → Train"
            subtitle="We layer short, high‑signal guides into your repo, wire verification, and enable your teams."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <FeatureCard title="Map">
              We scan your repo(s), build a guide tree, and baseline your <em>Agent Effectiveness Score</em> on real tasks.
            </FeatureCard>
            <FeatureCard title="Guide">
              We generate and refine <strong>agents.md</strong> at the right scopes—feature, service, system—focused on golden paths and signals.
            </FeatureCard>
            <FeatureCard title="Verify & Train">
              We wire doc‑tests, CI nudges, and IDE commands; then upskill a champion cohort to keep docs living.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section id="outcomes" className="py-16 md:py-24 bg-gradient-to-b from-white to-brand-50/50">
        <div className="mx-auto max-w-6xl container-px">
          <SectionHeading
            eyebrow="Outcomes"
            title="Enterprise results you can measure"
            subtitle="We don't sell slides—we move the numbers that matter."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <FeatureCard title="Agent Effectiveness Score (AES)">
              % of tasks agents complete without human fixes. We measure pre/post on real workflows.
            </FeatureCard>
            <FeatureCard title="Lead time & Reverts">
              Cut change lead time and reduce revert rate by making agent PRs safe and reviewable.
            </FeatureCard>
            <FeatureCard title="Coverage & Confidence">
              Track guide coverage across repos and the confidence of each area's guidance.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* What we install */}
      <section id="install" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl container-px">
          <SectionHeading
            eyebrow="What we install"
            title="Intent: the context layer your agents were missing"
            subtitle="A light footprint that sits alongside your code and tools."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <FeatureCard title="agents.md hierarchy">
              Short guides per directory/service with golden paths, invariants, and signals.
            </FeatureCard>
            <FeatureCard title="Verification">
              Doc‑tests to catch drift (routes, queues, envs, log lines) and PR nudges to keep guides fresh.
            </FeatureCard>
            <FeatureCard title="IDE & CI integration">
              Cursor/JetBrains commands and CI checks so guidance is always in the loop.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-16 md:py-24 bg-white">
        <div className="mx-auto max-w-6xl container-px">
          <SectionHeading
            eyebrow="Security"
            title="Enterprise‑ready: VPC or on‑prem, data boundaries respected"
            subtitle="Run where you need; keep intent and code inside your boundary."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <FeatureCard title="Private by default">
              All processing runs inside your boundary; redact secrets; opt‑in for any external calls.
            </FeatureCard>
            <FeatureCard title="Role‑based access">
              Restrict who can run modernization, verify changes, and approve rollouts.
            </FeatureCard>
            <FeatureCard title="Audit trails">
              Every run and doc update is logged for review and compliance.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 md:py-24 bg-gradient-to-b from-brand-50/50 to-white">
        <div className="mx-auto max-w-6xl container-px">
          <SectionHeading
            eyebrow="Get started"
            title="Request the Agent Effectiveness Assessment"
            subtitle="We'll baseline your codebase and show where to start. Typical engagements begin within 1–2 weeks."
          />
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-card">
            <ContactForm />
          </div>
          <p className="mt-6 text-center text-sm text-gray-600">
            Or email us at <a className="text-brand-700 hover:underline" href="mailto:hello@intent-systems.com">hello@intent-systems.com</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto max-w-6xl container-px py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Intent Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}


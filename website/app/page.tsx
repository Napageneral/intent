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
      <header className="sticky top-0 z-40 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl container-px flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden lg:flex items-center gap-8 text-sm text-gray-600">
            <a href="#how" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#outcomes" className="hover:text-gray-900 transition-colors">Outcomes</a>
            <a href="#install" className="hover:text-gray-900 transition-colors">What we install</a>
            <a href="#security" className="hover:text-gray-900 transition-colors">Security</a>
          </nav>
          <PrimaryButton href="#contact" className="hidden md:inline-flex">Get the Assessment</PrimaryButton>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(22,95,230,0.08),transparent_50%)]" />
        <div className="mx-auto max-w-7xl container-px py-24 md:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 leading-[1.1]">
                Make AI effective on your <span className="text-brand-600">legacy code</span>.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-gray-700 leading-relaxed">
                We turn your codebase into <strong>agent‑ready context</strong>—and train your teams to keep it that way.
                In 30 days, agents go from guessing to shipping safe changes your leads would approve.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <PrimaryButton href="#contact" className="text-base">
                  Request the Assessment
                </PrimaryButton>
                <a href="#contact" className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  Book a 20‑min fit call
                </a>
              </div>
              
              {/* Logo wall placeholder */}
              <div className="mt-10 opacity-75">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Trusted by engineering leaders</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <div className="h-8 w-28 bg-gray-200 rounded opacity-60" />
                  <div className="h-8 w-28 bg-gray-200 rounded opacity-60" />
                  <div className="h-8 w-28 bg-gray-200 rounded opacity-60" />
                  <div className="h-8 w-28 bg-gray-200 rounded opacity-60" />
                </div>
              </div>
            </div>

            {/* Right: Layered context diagram */}
            <div className="relative">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                <div className="mb-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Layered Context System</div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700">System</div>
                      <div className="text-xs text-gray-500">Org-wide</div>
                    </div>
                    <div className="mt-2 rounded bg-gray-100 px-3 py-2 font-mono text-xs text-gray-700">agents.md</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700">Service</div>
                      <div className="text-xs text-gray-500">API layer</div>
                    </div>
                    <div className="mt-2 rounded bg-blue-100 px-3 py-2 font-mono text-xs text-blue-900">agents.md</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-indigo-50 to-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700">Feature</div>
                      <div className="text-xs text-gray-500">Module scope</div>
                    </div>
                    <div className="mt-2 rounded bg-indigo-100 px-3 py-2 font-mono text-xs text-indigo-900">agents.md</div>
                  </div>
                  <div className="rounded-lg border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4">
                    <div className="text-sm font-semibold text-brand-700">Verification Layer</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-brand-700/80">
                      <span className="rounded bg-brand-100 px-2 py-1">routes</span>
                      <span className="rounded bg-brand-100 px-2 py-1">queues</span>
                      <span className="rounded bg-brand-100 px-2 py-1">envs</span>
                      <span className="rounded bg-brand-100 px-2 py-1">logs</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-brand-500/20 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-7xl container-px">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">How it works</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
              Map → Guide → Verify → Train
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              We layer short, high‑signal guides into your repo, wire verification, and enable your teams.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 font-semibold">1</div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Map</h3>
              <p className="mt-2 text-sm text-gray-600">
                We scan your repo(s), build a guide tree, and baseline your <em>Agent Effectiveness Score</em> on real tasks.
              </p>
            </div>
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 font-semibold">2</div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Guide</h3>
              <p className="mt-2 text-sm text-gray-600">
                We generate and refine <strong>agents.md</strong> at the right scopes—feature, service, system—focused on golden paths and signals.
              </p>
            </div>
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 font-semibold">3</div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Verify</h3>
              <p className="mt-2 text-sm text-gray-600">
                We wire doc‑tests (routes, queues, envs, logs) and PR nudges so guidance stays fresh.
              </p>
            </div>
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 font-semibold">4</div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Train</h3>
              <p className="mt-2 text-sm text-gray-600">
                We upskill your champions and add IDE/CI commands so everyone uses the context layer.
              </p>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-gray-500">
            Typical pilot: 4–6 weeks from kickoff
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section id="outcomes" className="py-20 md:py-28 bg-gradient-to-b from-white via-brand-50/30 to-white">
        <div className="mx-auto max-w-7xl container-px">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
              Enterprise results you can measure
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              We don't sell slides—we move the numbers that matter.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div>
              <div className="text-4xl md:text-5xl font-semibold text-gray-900">+40–70</div>
              <div className="mt-2 text-base font-medium text-gray-900">AES improvement</div>
              <div className="mt-1 text-sm text-gray-600">Agent Effectiveness Score on real workflows.</div>
              <div className="mt-2 text-xs text-gray-500">AES = % of tasks agents complete without human fixes</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-semibold text-gray-900">–30%</div>
              <div className="mt-2 text-base font-medium text-gray-900">Lead time</div>
              <div className="mt-1 text-sm text-gray-600">Faster time‑to‑merge by making agent PRs safe and reviewable.</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-semibold text-gray-900">–50%</div>
              <div className="mt-2 text-base font-medium text-gray-900">Reverts</div>
              <div className="mt-1 text-sm text-gray-600">Fewer rollbacks through clear invariants and doc‑tests.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl container-px">
          <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-brand-50/50 border border-gray-200 px-8 py-12 md:px-12 text-center">
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Ready to baseline your Agent Effectiveness Score?
            </h3>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
              Two‑week assessment. Clear plan to pilot.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <PrimaryButton href="#contact" className="text-base">
                Request the Assessment
              </PrimaryButton>
              <a href="#contact" className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-white transition-colors">
                Book a 20‑min fit call
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What we install */}
      <section id="install" className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-7xl container-px">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">What we install</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
              Intent: the context layer your agents were missing
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              A light footprint that sits alongside your code and tools.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-base font-semibold text-gray-900">agents.md hierarchy</div>
              <p className="mt-2 text-sm text-gray-600">
                Short, high‑signal guides where work happens.
              </p>
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">Verification</div>
              <p className="mt-2 text-sm text-gray-600">
                Drift checks and signals‑as‑tests wired into CI.
              </p>
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">Integrations</div>
              <p className="mt-2 text-sm text-gray-600">
                Cursor/JetBrains commands; GitHub/GitLab CI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 md:py-28 bg-gradient-to-b from-white to-gray-50">
        <div className="mx-auto max-w-7xl container-px">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Security</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
              Enterprise‑ready: VPC or on‑prem, data boundaries respected
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Run where you need; keep intent and code inside your boundary.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-base font-semibold text-gray-900">Private by default</div>
              <p className="mt-2 text-sm text-gray-600">
                All processing runs inside your boundary; redact secrets; opt‑in for any external calls.
              </p>
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">Role‑based access</div>
              <p className="mt-2 text-sm text-gray-600">
                Restrict who can run modernization, verify changes, and approve rollouts.
              </p>
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">Audit trails</div>
              <p className="mt-2 text-sm text-gray-600">
                Every run and doc update is logged for review and compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 md:py-28 bg-gradient-to-b from-gray-50 via-white to-white">
        <div className="mx-auto max-w-7xl container-px">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Get started</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
              Request the Agent Effectiveness Assessment
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              We'll baseline your codebase and show where to start. Typical engagements begin within 1–2 weeks.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <ContactForm />
          </div>
          <p className="mt-6 text-center text-sm text-gray-600">
            Or email us at <a className="text-brand-700 hover:underline font-medium" href="mailto:hello@intent-systems.com">hello@intent-systems.com</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl container-px py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-4">
              <Logo />
              <p className="text-sm text-gray-600">
                Make AI effective on your legacy code.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-3">
              <a href="mailto:hello@intent-systems.com" className="text-sm text-gray-600 hover:text-gray-900">
                hello@intent-systems.com
              </a>
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} Intent Systems. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}


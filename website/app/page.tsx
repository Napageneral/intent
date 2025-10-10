'use client';

import ContactForm from '@/components/ContactForm';
import dynamic from 'next/dynamic';

// Background attractor - GPU-based with 62.5k particles, trails, and bloom
// const AttractorBG = dynamic(() => import('@/components/AttractorBG'), { ssr: false });

// TESTING: Simpler GPU approach using working CPU baseline
const AttractorGPUSimple = dynamic(() => import('@/components/AttractorGPUSimple'), { ssr: false });

export default function Page() {
  return (
    <main>
      {/* Thomas attractor background - GPU-accelerated, 62.5k particles with trails & bloom */}
      {/* <AttractorBG /> */}
      
      {/* TESTING: Simpler GPU using working CPU baseline */}
      <AttractorGPUSimple />
      {/* Header - Minimal Tenex style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="container-px flex h-24 items-center justify-between pt-4">
          <div className="flex items-center gap-2 ml-4">
            <div className="h-6 w-6 bg-gradient-to-br from-yellow-400 to-yellow-600" />
            <span className="font-semibold tracking-tight text-lg" style={{ color: '#FFFFFF' }}>
              Intent <span className="text-yellow-400">Systems</span>
            </span>
          </div>
          
          {/* Hamburger menu */}
          <button className="flex flex-col gap-1.5 p-2 mr-4" aria-label="Menu">
            <span className="h-0.5 w-6 bg-white"></span>
            <span className="h-0.5 w-6 bg-white"></span>
            <span className="h-0.5 w-6 bg-white"></span>
          </button>
        </div>
      </header>

      {/* Hero section spacer (visual handled by fixed BG) */}
      <section className="relative min-h-screen" />

      {/* Our Approach - Strategy/Context/Enablement */}
      <section id="approach" className="relative py-32 z-10">
        <div className="container-px max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-6">OUR APPROACH</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight whitespace-nowrap">
              <span className="text-yellow-400">Intent</span> helps you shift from AI-absent to AI-native.
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Context Engineering */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 hover:border-yellow-400/30 transition-all duration-300">
              <div className="mb-6">
                <div className="inline-block p-3 rounded-lg bg-yellow-400/10 mb-4">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Context</h3>
                <p className="text-gray-400 leading-relaxed">
                  We turn your legacy codebase into agent-ready context. Layer guides into your repo that surface golden paths, invariants, and signals—so agents stop hallucinating and start shipping.
                </p>
              </div>
              <a href="#" className="text-sm text-yellow-400 hover:text-yellow-300 inline-flex items-center gap-2 group">
                Learn more
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            {/* Transformation */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 hover:border-yellow-400/30 transition-all duration-300">
              <div className="mb-6">
                <div className="inline-block p-3 rounded-lg bg-yellow-400/10 mb-4">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Transformation</h3>
                <p className="text-gray-400 leading-relaxed">
                  No 6-month strategy decks. We baseline your Agent Effectiveness Score, run pilots on real services, and deliver measurable ROI in weeks—not quarters.
                </p>
              </div>
              <a href="#" className="text-sm text-yellow-400 hover:text-yellow-300 inline-flex items-center gap-2 group">
                Learn more
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stark call-out - The Choice */}
      <section className="relative min-h-screen flex items-center justify-center z-10">
        <div className="w-full">
        {/* Corner brackets - Tenex style */}
        <div className="absolute top-20 left-20 w-16 h-16 border-l-2 border-t-2 border-white/30"></div>
        <div className="absolute top-20 right-20 w-16 h-16 border-r-2 border-t-2 border-white/30"></div>
        <div className="absolute bottom-20 left-20 w-16 h-16 border-l-2 border-b-2 border-white/30"></div>
        <div className="absolute bottom-20 right-20 w-16 h-16 border-r-2 border-b-2 border-white/30"></div>
        
        <div className="container-px max-w-7xl text-left px-2 md:px-4">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] mb-10" style={{ color: '#FFFFFF' }}>
            <span style={{ color: '#FFFFFF' }}>You have a choice.</span>
            <br />
            <span className="text-yellow-400">Disrupt yourself.</span>
            <br />
            <span style={{ color: '#FFFFFF' }}>Or be disrupted by <span className="text-yellow-400">others</span>.</span>
          </h2>
          
          <div className="space-y-3 text-2xl md:text-3xl max-w-6xl" style={{ lineHeight: '1.4' }}>
            <p style={{ color: '#FFFFFF' }}>
              Because as the cost of intelligence approaches zero, businesses will need to transition from AI-absent to AI-native if they want to stay relevant and succeed.
            </p>
            
            <p style={{ color: '#FFFFFF' }}>
              You could drive that transformation from within. Our bet is, you won't. Not because you don't want to. Not because you don't believe it's necessary. But because you're focused on <span style={{ fontWeight: 600 }}>business success, today</span>.
            </p>
            
            <p style={{ color: '#FFFFFF' }}>
              We don't care about today. We care about the next decade. And helping you win it.
            </p>
          </div>
          
          <div className="mt-10">
            <a 
              href="#contact" 
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 font-semibold hover:bg-yellow-400 transition-all duration-200 group text-lg"
            >
              Get started
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
        </div>
      </section>

      {/* AI isn't scary visual + social proof */}
      <section className="relative min-h-screen flex items-center justify-center z-10">
        <div className="w-full">
        <div className="container-px max-w-7xl w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Visual placeholder */}
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-yellow-400/10 to-transparent border border-white/10 flex items-center justify-center">
                {/* Placeholder - replace with actual image/gif */}
                <div className="text-center">
                  <div className="text-8xl mb-4">🧠</div>
                  <p className="text-gray-500 text-sm">Visual goes here</p>
                </div>
              </div>
            </div>
            
            {/* Right: Statement */}
            <div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-12">
                AI isn't scary. <span className="text-yellow-400">Ignoring it is.</span>
              </h2>
              
              {/* Social proof */}
              <div className="mt-12">
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6">Trusted by the best:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
                  {/* Logo placeholders */}
                  <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                    <span className="text-white/30 text-xs font-semibold">LOGO</span>
                  </div>
                  <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                    <span className="text-white/30 text-xs font-semibold">LOGO</span>
                  </div>
                  <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                    <span className="text-white/30 text-xs font-semibold">LOGO</span>
                  </div>
                  <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                    <span className="text-white/30 text-xs font-semibold">LOGO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Corner brackets */}
        <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-white/10"></div>
        <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-white/10"></div>
        <div className="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-white/10"></div>
        <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-white/10"></div>
        </div>
      </section>

      {/* Contact - Get Started */}
      <section id="contact" className="relative py-32 z-10">
        <div>
        <div className="container-px max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Left side */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Intent your business?
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                From context engineering to end-to-end AI transformation, we'll help you <span className="text-yellow-400">win the next decade</span>.
              </p>
              
              <div className="space-y-4 text-gray-400">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p>Baseline Agent Effectiveness on real workflows</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p>Install context layers that make agents reliable</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p>Train your teams to maintain AI-ready infrastructure</p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <ContactForm />
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              Or email us at{' '}
              <a href="mailto:hello@intent-systems.com" className="text-yellow-400 hover:text-yellow-300 transition-colors">
                hello@intent-systems.com
              </a>
            </p>
          </div>
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 z-10">
        <div className="container-px py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <span className="font-semibold tracking-tight text-lg" style={{ color: '#FFFFFF' }}>
                Intent <span className="text-yellow-400">Systems</span>
              </span>
            </div>
            
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Intent Systems. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

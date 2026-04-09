import { Hero } from '@/components/Hero';
import { ViralFeatures } from '@/components/ViralFeatures';
import { TopicGrid } from '@/components/TopicGrid';
import { Trending } from '@/components/Trending';
import { BottomSection } from '@/components/BottomSection';

export default function Home() {
  return (
    <main className="min-h-screen pb-20 relative selection:bg-rose-500/30">
      {/* Designer Background: Subtle Grid + Ambient Glow */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-zinc-950 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-[-10%] -z-10 m-auto h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-[120px]"></div>
      </div>

      {/* Floating Pill Navbar */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto h-14 w-full max-w-5xl rounded-full border border-white/10 bg-zinc-950/50 backdrop-blur-xl shadow-2xl flex items-center justify-between px-6">
          <div className="font-display font-bold text-lg tracking-tight flex items-center gap-2.5 text-white">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center shadow-inner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            GitStack
          </div>
          <div className="flex items-center gap-6">
            <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden md:block">
              Sign in
            </button>
            <button className="text-sm font-medium bg-white text-zinc-950 px-5 py-2 rounded-full hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Get Started
            </button>
          </div>
        </nav>
      </div>

      <div className="pt-32">
        <Hero />
        <ViralFeatures />
        <TopicGrid />
        <Trending />
        <BottomSection />
      </div>
    </main>
  );
}

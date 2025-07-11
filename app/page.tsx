import { WalletConnect } from '@/components/WalletConnect'

export default function Home() {
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Hero Section */}
      <section className="relative h-screen bg-gradient-to-br from-ufc-red via-electric-orange to-neon-pink text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center max-w-4xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-6xl font-black tracking-tight sm:text-7xl mb-6">
              <span className="text-white">PUMP</span>
              <span className="text-fight-gold">FIGHT</span>
            </h1>
            <p className="text-2xl font-bold mb-4 text-white/90">
              🥊 WHERE FIGHTERS LAUNCH THEIR LEGACY 🥊
            </p>
            <p className="mt-6 text-xl leading-8 text-white/80 max-w-3xl mx-auto">
              The ultimate token launchpad for combat sports legends. Trade fighter tokens, back your champions, and join the meme revolution of sports finance on Chiliz Chain.
            </p>
            <div className="mt-10 flex justify-center">
              <div className="octagon-wallet-button">
                <WalletConnect />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-dark-bg to-card-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-black text-center mb-16 bg-gradient-to-r from-electric-orange to-neon-pink bg-clip-text text-transparent">
            🔥 WHY PUMPFIGHT HITS DIFFERENT 🔥
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card-dark border-2 border-ufc-red/30 hover:border-ufc-red transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl hover:shadow-ufc-red/20 transform hover:scale-105">
              <div className="p-8">
                <div className="text-4xl mb-4">🥊</div>
                <h3 className="text-2xl font-bold text-white mb-4">VERIFIED FIGHTERS</h3>
                <p className="text-gray-300 text-lg">
                  Only real combat sports legends. No fake fighters, no BS. Every token is backed by a verified athlete with proven records.
                </p>
              </div>
            </div>
            <div className="bg-card-dark border-2 border-electric-orange/30 hover:border-electric-orange transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl hover:shadow-electric-orange/20 transform hover:scale-105">
              <div className="p-8">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold text-white mb-4">CHILIZ POWERED</h3>
                <p className="text-gray-300 text-lg">
                  Built on the ultimate sports blockchain. Lightning-fast trades, minimal fees, maximum hype for true sports fans.
                </p>
              </div>
            </div>
            <div className="bg-card-dark border-2 border-energy-green/30 hover:border-energy-green transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl hover:shadow-energy-green/20 transform hover:scale-105">
              <div className="p-8">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-2xl font-bold text-white mb-4">RUG-PROOF TECH</h3>
                <p className="text-gray-300 text-lg">
                  Anti-rug mechanisms that actually work. Your bags are safe from paper hands and exit scammers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
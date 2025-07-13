import BrowseTokens from '@/components/BrowseTokens';

export default function BrowseTokensPage() {
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card-dark border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-4">
              <span className="text-fight-gold">BROWSE</span> TOKENS
            </h1>
            <h2 className="text-xl font-bold text-gray-300 mb-4">
              🚀 Discover Active Token Communities
            </h2>
            <p className="text-gray-300 text-lg">
              Explore all tokens created with bonding curve pricing. Track performance, discover opportunities, and join thriving communities.
            </p>
          </div>

          <BrowseTokens />
        </div>
      </main>
    </div>
  );
}
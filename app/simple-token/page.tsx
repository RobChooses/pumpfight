import SimpleTokenCreator from '@/components/SimpleTokenCreator';

export default function SimpleTokenPage() {
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card-dark border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-4">
              <span className="text-fight-gold">SIMPLE</span> TOKEN LAUNCHPAD
            </h1>
            <h2 className="text-xl font-bold text-gray-300 mb-4">
              🚀 Create Your Token with Bonding Curve
            </h2>
            <p className="text-gray-300 text-lg">
              Launch CAP-20 tokens with automatic bonding curve pricing. Perfect for creators, communities, and projects.
            </p>
          </div>

          <SimpleTokenCreator />
        </div>

        {/* Info Section */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-3">📋 Features</h3>
            <ul className="text-gray-300 space-y-2">
              <li>• No creation fees - completely free</li>
              <li>• Automatic bonding curve pricing</li>
              <li>• Starts at 0.001 CHZ per token</li>
              <li>• Price increases with demand</li>
              <li>• Fair price discovery mechanism</li>
            </ul>
          </div>
          
          <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-3">⚡ Bonding Curve</h3>
            <ul className="text-gray-300 space-y-2">
              <li>• Step-based price increases</li>
              <li>• +0.0001 CHZ every 1,000 tokens</li>
              <li>• Early supporters get best prices</li>
              <li>• All revenue to token creator</li>
              <li>• Transparent pricing algorithm</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
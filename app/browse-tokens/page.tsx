import BrowseTokens from '@/components/BrowseTokens';

export default function BrowseTokensPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Created Tokens
          </h1>
          <p className="text-gray-600">
            View all tokens created with the Simple Token Launchpad
          </p>
        </div>
        
        <BrowseTokens />
      </div>
    </div>
  );
}
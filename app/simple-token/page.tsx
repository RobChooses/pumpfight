import SimpleTokenCreator from '@/components/SimpleTokenCreator';

export default function SimpleTokenPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Simple Token Launchpad
          </h1>
          <p className="text-gray-600">
            Create and mint basic CAP-20 tokens at 1 CHZ per token
          </p>
        </div>
        
        <SimpleTokenCreator />
        
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">How it works:</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Enter a name and symbol for your token</li>
            <li>Click "Create Token" to deploy your CAP-20 token</li>
            <li>Once created, you can mint tokens at 1 CHZ each</li>
            <li>CHZ payments go directly to the token creator</li>
            <li>No fees, no bonding curves - just simple minting</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
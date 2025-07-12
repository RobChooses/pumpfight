export function Navbar() {
  return (
    <nav className="bg-card-dark border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="text-2xl font-black text-white">
              <span className="text-white">PUMP</span>
              <span className="text-fight-gold">FIGHT</span>
            </a>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a 
              href="/" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Home
            </a>
            <a 
              href="/create" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Create Token
            </a>
            <a 
              href="/tokens" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Browse Tokens
            </a>
          </div>

          {/* Right side - Coming Soon */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Wallet Connection Coming Soon
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-700 py-3">
          <div className="flex space-x-4">
            <a href="/" className="text-gray-300 hover:text-white text-sm">Home</a>
            <a href="/create" className="text-gray-300 hover:text-white text-sm">Create</a>
            <a href="/tokens" className="text-gray-300 hover:text-white text-sm">Browse</a>
          </div>
        </div>
      </div>
    </nav>
  )
}
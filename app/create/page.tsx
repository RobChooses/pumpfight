'use client'

import { useState } from 'react'
import { ethers } from 'ethers'
import { CreateFighterTokenForm } from '@/components/CreateFighterTokenForm'

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card-dark border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-4">
              <span className="text-fight-gold">CREATE</span> FIGHTER TOKEN
            </h1>
            <h2 className="text-xl font-bold text-gray-300 mb-4">
              🥊 Launch Your Fighter Token
            </h2>
            <p className="text-gray-300 text-lg">
              Create a token for your combat sports career. Only verified fighters can launch tokens on PumpFight.
            </p>
          </div>

          <CreateFighterTokenForm />
        </div>

        {/* Info Section */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-3">📋 Requirements</h3>
            <ul className="text-gray-300 space-y-2">
              <li>• Must be a verified fighter</li>
              <li>• Creation fee: 1 CHZ</li>
              <li>• Valid token name and symbol</li>
              <li>• Fighter description and image</li>
            </ul>
          </div>
          
          <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-3">⚡ Token Features</h3>
            <ul className="text-gray-300 space-y-2">
              <li>• Bonding curve price discovery</li>
              <li>• Anti-rug protection mechanisms</li>
              <li>• Fan utility and voting rights</li>
              <li>• Revenue sharing with holders</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
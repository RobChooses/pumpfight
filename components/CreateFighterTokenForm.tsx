'use client'

import { useState } from 'react'
import { ethers } from 'ethers'
import { usePumpFightFactory } from '@/hooks/usePumpFightFactory'

interface FormData {
  tokenName: string
  tokenSymbol: string
  description: string
  imageUrl: string
}

interface FormErrors {
  tokenName?: string
  tokenSymbol?: string
  description?: string
  imageUrl?: string
  general?: string
}

export function CreateFighterTokenForm() {
  const [formData, setFormData] = useState<FormData>({
    tokenName: '',
    tokenSymbol: '',
    description: '',
    imageUrl: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  
  const { createFighterToken, isLoading } = usePumpFightFactory()

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.tokenName.trim()) {
      newErrors.tokenName = 'Token name is required'
    } else if (formData.tokenName.length < 3) {
      newErrors.tokenName = 'Token name must be at least 3 characters'
    }
    
    if (!formData.tokenSymbol.trim()) {
      newErrors.tokenSymbol = 'Token symbol is required'
    } else if (formData.tokenSymbol.length < 2 || formData.tokenSymbol.length > 6) {
      newErrors.tokenSymbol = 'Token symbol must be 2-6 characters'
    } else if (!/^[A-Z]+$/.test(formData.tokenSymbol)) {
      newErrors.tokenSymbol = 'Token symbol must contain only uppercase letters'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }
    
    if (!formData.imageUrl.trim()) {
      newErrors.imageUrl = 'Image URL is required'
    } else if (!isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'Please enter a valid URL'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      const tx = await createFighterToken(
        formData.tokenName,
        formData.tokenSymbol,
        formData.description,
        formData.imageUrl
      )
      
      setTxHash(tx.hash)
      
      // Reset form on success
      setFormData({
        tokenName: '',
        tokenSymbol: '',
        description: '',
        imageUrl: ''
      })
      
    } catch (error: any) {
      console.error('Error creating fighter token:', error)
      
      let errorMessage = 'Failed to create fighter token'
      
      if (error.code === 4001) {
        errorMessage = 'Transaction was rejected by user'
      } else if (error.message?.includes('Fighter not verified')) {
        errorMessage = 'You must be a verified fighter to create tokens'
      } else if (error.message?.includes('Insufficient creation fee')) {
        errorMessage = 'Insufficient CHZ for creation fee (1 CHZ required)'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient CHZ balance in your wallet'
      }
      
      setErrors({ general: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (txHash) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-6">🎉</div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Fighter Token Created Successfully!
        </h3>
        <p className="text-gray-300 mb-6">
          Your fighter token has been launched on PumpFight
        </p>
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400 mb-2">Transaction Hash:</p>
          <p className="text-white font-mono text-sm break-all">
            {txHash}
          </p>
        </div>
        <button
          onClick={() => {
            setTxHash(null)
            setFormData({
              tokenName: '',
              tokenSymbol: '',
              description: '',
              imageUrl: ''
            })
          }}
          className="px-6 py-3 bg-gradient-to-r from-ufc-red to-electric-orange text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          Create Another Token
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{errors.general}</p>
        </div>
      )}

      {/* Token Name */}
      <div>
        <label htmlFor="tokenName" className="block text-sm font-medium text-gray-300 mb-2">
          Token Name *
        </label>
        <input
          type="text"
          id="tokenName"
          value={formData.tokenName}
          onChange={(e) => handleInputChange('tokenName', e.target.value)}
          placeholder="e.g., Jon Jones Fighter Token"
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent ${
            errors.tokenName ? 'border-red-500' : 'border-gray-600'
          }`}
          disabled={isSubmitting}
        />
        {errors.tokenName && (
          <p className="text-red-400 text-sm mt-1">{errors.tokenName}</p>
        )}
      </div>

      {/* Token Symbol */}
      <div>
        <label htmlFor="tokenSymbol" className="block text-sm font-medium text-gray-300 mb-2">
          Token Symbol *
        </label>
        <input
          type="text"
          id="tokenSymbol"
          value={formData.tokenSymbol}
          onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
          placeholder="e.g., JONES"
          maxLength={6}
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent ${
            errors.tokenSymbol ? 'border-red-500' : 'border-gray-600'
          }`}
          disabled={isSubmitting}
        />
        {errors.tokenSymbol && (
          <p className="text-red-400 text-sm mt-1">{errors.tokenSymbol}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
          Fighter Description *
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Tell fans about your fighting career, achievements, and what makes you special..."
          rows={4}
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent resize-vertical ${
            errors.description ? 'border-red-500' : 'border-gray-600'
          }`}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="text-red-400 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      {/* Image URL */}
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-300 mb-2">
          Fighter Image URL *
        </label>
        <input
          type="url"
          id="imageUrl"
          value={formData.imageUrl}
          onChange={(e) => handleInputChange('imageUrl', e.target.value)}
          placeholder="https://example.com/fighter-photo.jpg"
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent ${
            errors.imageUrl ? 'border-red-500' : 'border-gray-600'
          }`}
          disabled={isSubmitting}
        />
        {errors.imageUrl && (
          <p className="text-red-400 text-sm mt-1">{errors.imageUrl}</p>
        )}
        {formData.imageUrl && isValidUrl(formData.imageUrl) && (
          <div className="mt-3">
            <p className="text-sm text-gray-400 mb-2">Preview:</p>
            <img 
              src={formData.imageUrl} 
              alt="Fighter preview" 
              className="w-32 h-32 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-6">
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full px-6 py-4 bg-gradient-to-r from-ufc-red to-electric-orange text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Creating Token...
            </div>
          ) : (
            'Create Fighter Token (1 CHZ)'
          )}
        </button>
      </div>

      {/* Fee Notice */}
      <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
        <p className="text-yellow-400 text-sm">
          ⚠️ <strong>Creation Fee:</strong> 1 CHZ will be charged to create your fighter token. 
          Make sure you have sufficient CHZ in your wallet.
        </p>
      </div>
    </form>
  )
}
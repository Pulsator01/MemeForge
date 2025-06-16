import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Loader2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateTokenParameters } from '@/app/utils/aiAgent';
import { useLaunchpad } from '@/hooks/useLaunchpad';
import { getMemecoinAddress, saveMemecoinAddress } from '@/app/utils/tokenUtils';

interface CreateTokenFormProps {
  onSuccess?: () => void;
}

export function CreateTokenForm({ onSuccess }: CreateTokenFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Memegent form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [traits, setTraits] = useState<string[]>(['']);

  // Memecoin form state
  const [symbol, setSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState('');
  const [bondingCurveSupply, setBondingCurveSupply] = useState('');
  const [priceSteps, setPriceSteps] = useState([
    { tokenSupplyThreshold: '', pricePerToken: '' }
  ]);
  
  // UI state
  const [showTokenSection, setShowTokenSection] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [tokenDeployed, setTokenDeployed] = useState(false);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  
  // Launchpad hook
  const { launchToken, loading: tokenLoading, error: tokenError, result: tokenResult } = useLaunchpad();
  
  // Price step management
  const addPriceStep = () => {
    setPriceSteps([...priceSteps, { tokenSupplyThreshold: '', pricePerToken: '' }]);
  };

  const removePriceStep = (index: number) => {
    if (priceSteps.length > 1) {
      setPriceSteps(priceSteps.filter((_, i) => i !== index));
    }
  };

  const updatePriceStep = (index: number, field: 'tokenSupplyThreshold' | 'pricePerToken', value: string) => {
    const updated = [...priceSteps];
    updated[index][field] = value;
    setPriceSteps(updated);
  };
  
  // Reset error messages when form fields change
  useEffect(() => {
    setAIError(null);
  }, [name]);

  // Get stored token address on mount
  useEffect(() => {
    const storedAddress = getMemecoinAddress();
    if (storedAddress) {
      setTokenAddress(storedAddress);
      setTokenDeployed(true);
    }
  }, []);

  // Add a new trait input field
  const addTrait = () => {
    setTraits([...traits, '']);
  };
  
  // Remove a trait input field
  const removeTrait = (index: number) => {
    const newTraits = [...traits];
    newTraits.splice(index, 1);
    setTraits(newTraits.length ? newTraits : ['']);
  };
  
  // Update a trait value
  const updateTrait = (index: number, value: string) => {
    const newTraits = [...traits];
    newTraits[index] = value;
    setTraits(newTraits);
  };
  
  // Generate AI parameters for token
  const handleGenerateParams = async () => {
    if (!name.trim()) {
      setAIError('Please enter a token name to generate parameters');
      return;
    }
    
    setIsAILoading(true);
    setAIError(null);
    
    try {
      const params = await generateTokenParameters(name);
      
      // Update form with AI-generated values
      setSymbol(params.symbol);
      setInitialSupply(params.initialSupply);
      setBondingCurveSupply(params.bondingCurveSupply || '500000');
      // Set default price steps
      setPriceSteps([
        { tokenSupplyThreshold: '100000', pricePerToken: '0.001' },
        { tokenSupplyThreshold: '300000', pricePerToken: '0.002' },
        { tokenSupplyThreshold: '500000', pricePerToken: '0.005' }
      ]);
    } catch (error: any) {
      setAIError(error.message || 'Failed to generate parameters');
    } finally {
      setIsAILoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // If only testing token deployment (token section is expanded), skip agent creation
      if (showTokenSection) {
        // Validate token section
        if (!symbol || !initialSupply || !bondingCurveSupply) {
          setError('All token fields are required');
          setIsLoading(false);
          return;
        }

        // Validate price steps
        const validPriceSteps = priceSteps.filter(step => 
          step.tokenSupplyThreshold.trim() !== '' && step.pricePerToken.trim() !== ''
        );
        
        if (validPriceSteps.length === 0) {
          setError('At least one valid price step is required');
          setIsLoading(false);
          return;
        }

        // Deploy the token directly
        const result = await launchToken({
          name: name || 'TestToken',
          symbol,
          initialSupply,
          pairedToken: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
          bondingCurveSupply,
          priceSteps: validPriceSteps
        });
        
        if (result.success && result.tokenAddress) {
          setTokenDeployed(true);
          setTokenAddress(result.tokenAddress);
          
          // Display the address prominently
          console.log('⭐ Token deployed successfully at:', result.tokenAddress);
          console.log('🔄 Bonding curve initialized with', validPriceSteps.length, 'price steps');
          saveMemecoinAddress(result.tokenAddress);
          
          // Handle success
          setSuccess(true);
          if (onSuccess) {
            onSuccess();
          }
        } else if (result.error) {
          throw new Error(`Token deployment failed: ${result.error}`);
        }
        
        setIsLoading(false);
        return;
      }

      // Original flow: Create memegent (requires server)
      // Validate memegent form
      if (!name.trim()) {
        setError('Memegent name is required');
        setIsLoading(false);
        return;
      }
      
      if (!bio.trim()) {
        setError('Memegent description is required');
        setIsLoading(false);
        return;
      }
      
      // Filter out empty traits
      const filteredTraits = traits.filter(trait => trait.trim() !== '');
      if (filteredTraits.length === 0) {
        setError('At least one trait is required');
        setIsLoading(false);
        return;
      }
      
      // Step 1: Create the memegent
      const agentData = {
        name,
        bio: bio.split('\n').filter(line => line.trim() !== ''),
        traits: filteredTraits,
        examples: [],
        example_accounts: [],
        loop_delay: 60,
        use_time_based_weights: true,
        time_based_multipliers: {
          tweet_night_multiplier: 0.4,
          engagement_day_multiplier: 1.5
        },
        tasks: [
          {
            name: "respond-to-mentions",
            weight: 0.5
          }
        ]
      };
      
      // Send data to API
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create memegent');
      }

      // Handle success
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      
      // Redirect to the new agent page after a delay
      setTimeout(() => {
        router.push(`/agents/${encodeURIComponent(name)}`);
      }, 3000);
      
    } catch (err) {
      console.error('Error creating token:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="glassmorphic rounded-xl p-6 md:p-8">
      <h2 className="text-2xl font-bold font-orbitron text-gradient mb-6">Create Your Memegent</h2>
      
      {success ? (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
          <p className="text-green-400">
            {showTokenSection ? 'Token deployed successfully!' : 'Your memegent has been created successfully!'}
          </p>
          {tokenDeployed && tokenAddress && tokenResult && (
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-300 font-bold mb-2">🎉 Bonding Curve Deployed</h3>
              <div className="text-blue-200 text-sm space-y-1">
                <div><b>Token Address:</b> <span className="font-mono">{tokenAddress}</span></div>
                {tokenResult.bondingCurveAddress && (
                  <div><b>Bonding Curve:</b> <span className="font-mono">{tokenResult.bondingCurveAddress}</span></div>
                )}
                {tokenResult.bondingCurveSupply && (
                  <div><b>Curve Supply:</b> {tokenResult.bondingCurveSupply} tokens</div>
                )}
                {tokenResult.creatorSupply && (
                  <div><b>Creator Supply:</b> {tokenResult.creatorSupply} tokens</div>
                )}
                <div className="pt-2">
                  <a 
                    href={`https://testnet.sonicscan.org/address/${tokenAddress}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View on Sonic Explorer →
                  </a>
                </div>
              </div>
            </div>
          )}
          {!showTokenSection && <p className="mt-2 text-green-400">Redirecting...</p>}
        </div>
      ) : error || aiError || tokenError ? (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error || aiError || tokenError}</p>
        </div>
      ) : null}
      
      <form onSubmit={handleSubmit}>
        {/* Memegent Section */}
        <div className="mb-6">
          <label htmlFor="name" className="block text-gray-300 mb-2">
            Memegent Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Papi, KittyKat, etc."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF]"
            disabled={isLoading}
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="bio" className="block text-gray-300 mb-2">
            Memegent Description <span className="text-red-400">*</span>
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your memegent's personality, purpose, and backstory..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF] min-h-[120px]"
            disabled={isLoading}
          />
          <p className="text-gray-400 text-sm mt-1">
            Each paragraph will be treated as a separate bio entry.
          </p>
        </div>
        
        <div className="mb-8">
          <label className="block text-gray-300 mb-2">
            Memegent Traits <span className="text-red-400">*</span>
          </label>
          <p className="text-gray-400 text-sm mb-3">
            Add traits that define your memegent's personality (e.g., "Funny", "Sarcastic", "Helpful").
          </p>
          
          {traits.map((trait, index) => (
            <div key={index} className="flex items-center mb-3">
              <input
                type="text"
                value={trait}
                onChange={(e) => updateTrait(index, e.target.value)}
                placeholder={`Trait ${index + 1}`}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF]"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => removeTrait(index)}
                className="ml-2 p-2 text-gray-400 hover:text-white transition-colors"
                disabled={traits.length === 1 || isLoading}
              >
                <X size={20} />
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addTrait}
            className="flex items-center text-[#32A9FF] hover:text-[#5BBDFF] transition-colors mt-2"
            disabled={isLoading}
          >
            <Plus size={16} className="mr-1" />
            <span>Add Another Trait</span>
          </button>
        </div>
        
        {/* Token Section Toggle */}
        <div className="mb-6 border-t border-gray-800 pt-6">
          <button
            type="button"
            onClick={() => setShowTokenSection(!showTokenSection)}
            className="flex items-center justify-between w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="font-semibold">Memecoin Parameters</span>
            {showTokenSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
        
        {/* Token Section (Expandable) */}
        {showTokenSection && (
          <div className="pl-4 border-l-2 border-[#32A9FF]/30 mb-8 space-y-6">
            <div className="mb-0">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="token-name" className="block text-gray-300">
                  Token Name
                </label>
                <button
                  type="button"
                  onClick={handleGenerateParams}
                  className="text-xs px-2 py-1 bg-[#32A9FF]/20 hover:bg-[#32A9FF]/30 border border-[#32A9FF]/50 rounded-lg transition-colors flex items-center"
                  disabled={isAILoading || !name.trim() || isLoading}
                >
                  {isAILoading ? (
                    <Loader2 size={12} className="animate-spin mr-1" />
                  ) : (
                    <RefreshCw size={12} className="mr-1" />
                  )}
                  <span>Generate with AI</span>
                </button>
              </div>
              <input
                id="token-name"
                type="text"
                value={name}
                disabled
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF] opacity-70"
              />
              <p className="text-gray-400 text-xs mt-1">
                Same as your memegent name
              </p>
            </div>
            
            <div>
              <label htmlFor="symbol" className="block text-gray-300 mb-2">
                Token Symbol <span className="text-red-400">*</span>
              </label>
              <input
                id="symbol"
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. DOGE"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF]"
                disabled={isLoading || isAILoading}
              />
            </div>
            
            <div>
              <label htmlFor="initialSupply" className="block text-gray-300 mb-2">
                Initial Supply <span className="text-red-400">*</span>
              </label>
              <input
                id="initialSupply"
                type="text"
                value={initialSupply}
                onChange={(e) => setInitialSupply(e.target.value)}
                placeholder="e.g. 1000000"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF]"
                disabled={isLoading || isAILoading}
              />
            </div>
            
            <div>
              <label htmlFor="bondingCurveSupply" className="block text-gray-300 mb-2">
                Bonding Curve Supply <span className="text-red-400">*</span>
              </label>
              <input
                id="bondingCurveSupply"
                type="text"
                value={bondingCurveSupply}
                onChange={(e) => setBondingCurveSupply(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF]"
                disabled={isLoading || isAILoading}
              />
              <p className="text-gray-400 text-xs mt-1">Amount of tokens allocated to the bonding curve</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-300">
                  Price Steps <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={addPriceStep}
                  className="text-xs px-2 py-1 bg-[#32A9FF]/20 hover:bg-[#32A9FF]/30 border border-[#32A9FF]/50 rounded-lg transition-colors flex items-center"
                  disabled={isLoading || isAILoading}
                >
                  <Plus size={12} className="mr-1" />
                  Add Step
                </button>
              </div>
              
              {priceSteps.map((step, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={step.tokenSupplyThreshold}
                      onChange={(e) => updatePriceStep(index, 'tokenSupplyThreshold', e.target.value)}
                      placeholder="Token threshold"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF] text-sm"
                      disabled={isLoading || isAILoading}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={step.pricePerToken}
                      onChange={(e) => updatePriceStep(index, 'pricePerToken', e.target.value)}
                      placeholder="Price per token"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF] text-sm"
                      disabled={isLoading || isAILoading}
                    />
                  </div>
                  {priceSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePriceStep(index)}
                      className="px-2 py-2 text-red-400 hover:text-red-300 transition-colors"
                      disabled={isLoading || isAILoading}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <p className="text-gray-400 text-xs mt-1">
                Define price steps: threshold = cumulative tokens sold, price = cost per token in paired token
              </p>
            </div>

          </div>
        )}
        
        {/* Submit Button */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] text-white font-bold text-lg flex items-center justify-center"
          disabled={isLoading || isAILoading || tokenLoading}
        >
          {isLoading || tokenLoading ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              {showTokenSection ? 'Creating Memegent & Deploying Token...' : 'Creating Memegent...'}
            </>
          ) : (
            showTokenSection ? 'Create Memegent & Deploy Token' : 'Create Memegent'
          )}
        </motion.button>
      </form>
    </div>
  );
} 
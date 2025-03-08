import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateTokenFormProps {
  onSuccess?: () => void;
}

export function CreateTokenForm({ onSuccess }: CreateTokenFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [traits, setTraits] = useState<string[]>(['']);
  
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
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Validate form
    if (!name.trim()) {
      setError('Token name is required');
      setIsLoading(false);
      return;
    }
    
    if (!bio.trim()) {
      setError('Token description is required');
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
    
    try {
      // Prepare data for API
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
        throw new Error(errorData.detail || 'Failed to create token');
      }
      
      // Handle success
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      
      // Redirect to the new agent page after a delay
      setTimeout(() => {
        router.push(`/agents/${encodeURIComponent(name)}`);
      }, 2000);
      
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
          <p className="text-green-400">Your token has been created successfully! Redirecting...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      ) : null}
      
      <form onSubmit={handleSubmit}>
        {/* Token Name */}
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
        
        {/* Token Bio/Description */}
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
        
        {/* Token Traits */}
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
        
        {/* Submit Button */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] text-white font-bold text-lg flex items-center justify-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Creating Memegent...
            </>
          ) : (
            'Create Memegent'
          )}
        </motion.button>
      </form>
    </div>
  );
} 
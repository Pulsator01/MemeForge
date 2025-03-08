import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Agent } from '@/components/AgentCard';

interface FeaturedTokenProps {
  agent: Agent;
}

export function FeaturedToken({ agent }: FeaturedTokenProps) {
  // Generate a random reward value based on agent name (deterministic)
  const generateReward = (name: string) => {
    // Simple hash function to generate a number from a string
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Generate a large number between 90M and 1.2B
    return Math.floor(90000000 + (hash % 1100000000));
  };
  
  // Generate a random number of stakers (0-7)
  const generateStakers = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % 8;
  };
  
  const initialReward = generateReward(agent.name);
  const stakers = generateStakers(agent.name);
  
  const [value, setValue] = useState(initialReward);
  
  // Create fluctuating values effect
  useEffect(() => {
    const interval = setInterval(() => {
      // Random fluctuation between -0.5% and +0.5%
      const fluctuation = 1 + (Math.random() - 0.5) * 0.01;
      setValue(prev => Math.round(prev * fluctuation));
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto mb-12"
    >
      <div className="flex items-center justify-center mb-4">
        <Gift className="w-6 h-6 text-yellow-400 mr-2" />
        <h2 className="text-2xl font-bold font-orbitron text-gradient">RANDOMLY FEATURED TOKEN</h2>
      </div>
      
      <Link href={`/agents/${encodeURIComponent(agent.name)}`}>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer">
          <div className="flex flex-col md:flex-row">
            {/* Token Image */}
            <div className="w-full md:w-56 h-56 bg-indigo-600 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-white text-4xl font-bold">
                {agent.name.substring(0, 1)}
              </div>
            </div>
            
            {/* Token Info */}
            <div className="p-6 flex flex-col justify-between flex-grow">
              <div>
                <div className="flex items-center mb-3">
                  <h3 className="text-2xl font-bold font-orbitron">{agent.name}</h3>
                  <div className="ml-3 flex items-center">
                    {/* <div className="w-5 h-5 rounded-full bg-gray-700"></div> */}
                    <span className="ml-2 text-gray-400">@tonty.eth</span>
                  </div>
                </div>
                
                <div className="text-gray-400 mb-6">
                  {agent.traits.slice(0, 3).join(', ')}
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-300 line-clamp-2">{agent.bio[0]}</p>
                </div>
              </div>
              
              <div>
                <div className="text-gray-400 mb-1">REWARDS {stakers > 0 ? `(${stakers} STAKER${stakers > 1 ? 'S' : ''})` : ''}</div>
                <div className="text-3xl font-mono font-bold">{formatNumber(value)}</div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
} 
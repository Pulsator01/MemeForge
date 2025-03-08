import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Agent } from '@/components/AgentCard';
import Link from 'next/link';

interface TokenCardProps {
  agent: Agent;
  featured?: boolean;
}

export function TokenCard({ agent, featured = false }: TokenCardProps) {
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
    <Link href={`/agents/${encodeURIComponent(agent.name)}`}>
      <motion.div
        whileHover={{ scale: 1.03 }}
        className={`overflow-hidden rounded-xl ${featured ? 'bg-white/5 border border-white/10' : 'bg-white/5'} cursor-pointer`}
      >
        <div className="flex items-stretch">
          {/* Token Image */}
          <div className={`${featured ? 'w-56 h-56' : 'w-32 h-32'} bg-indigo-600 relative overflow-hidden`}>
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
              {agent.name.substring(0, 1)}
            </div>
          </div>
          
          {/* Token Info */}
          <div className="p-4 flex flex-col justify-between flex-grow">
            <div>
              <div className="flex items-center mb-2">
                <h3 className="text-xl font-bold">{agent.name}</h3>
                <div className="ml-2 flex items-center">
                  {/* <div className="w-4 h-4 rounded-full bg-gray-700"></div> */}
                  <span className="ml-1 text-sm text-gray-400">@tonty.eth</span>
                </div>
              </div>
              
              <div className="text-gray-400 text-sm mb-4">
                {agent.traits.slice(0, 2).join(', ')}
              </div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">REWARDS {stakers > 0 ? `(${stakers} STAKER${stakers > 1 ? 'S' : ''})` : ''}</div>
              <div className="text-xl font-mono font-bold">{formatNumber(value)}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
} 
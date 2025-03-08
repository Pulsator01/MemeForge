import { motion } from 'framer-motion';
import { Bot, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export interface Agent {
  name: string;
  bio: string[];
  traits: string[];
}

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="glassmorphic rounded-xl overflow-hidden"
    >
      <Link href={`/agents/${encodeURIComponent(agent.name)}`} className="block">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold font-orbitron text-gradient">{agent.name}</h3>
          </div>
          
          <p className="text-gray-300 mb-4 line-clamp-2">{agent.bio[0]}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {agent.traits.slice(0, 3).map((trait, index) => (
              <span 
                key={index} 
                className="px-2 py-1 text-xs rounded-full bg-white/10 text-gray-200"
              >
                {trait}
              </span>
            ))}
            {agent.traits.length > 3 && (
              <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-gray-200">
                +{agent.traits.length - 3} more
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm">+{Math.floor(Math.random() * 100)}%</span>
            </div>
            <span className="text-sm text-gray-400">View Details</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
} 
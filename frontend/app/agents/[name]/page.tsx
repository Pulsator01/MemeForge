"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bot, ArrowLeft, TrendingUp, Users, MessageSquare } from 'lucide-react'
import { fetchAgentDetails } from '@/app/utils/api'
import { Agent } from '@/components/AgentCard'
import { TokenChart } from '@/components/TokenChart'

export default function AgentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadAgentDetails() {
      setIsLoading(true)
      try {
        if (typeof params.name !== 'string') {
          throw new Error('Invalid agent name')
        }
        
        const decodedName = decodeURIComponent(params.name)
        const agentData = await fetchAgentDetails(decodedName)
        
        if (!agentData) {
          throw new Error('Agent not found')
        }
        
        setAgent(agentData)
      } catch (error) {
        console.error('Failed to load agent details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAgentDetails()
  }, [params.name])

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#32A9FF]"></div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold mb-4">Agent not found</h1>
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-[#32A9FF]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>
    )
  }
  return (
    <main className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Agents</span>
        </button>

        {/* Agent Header */}
        <div className="glassmorphic rounded-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] flex items-center justify-center">
              <Bot className="w-10 h-10 text-white" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold font-orbitron text-gradient mb-2">
                {agent.name}
              </h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {agent.traits.map((trait, index) => (
                  <span 
                    key={index} 
                    className="px-3 py-1 text-sm rounded-full bg-white/10 text-gray-200"
                  >
                    {trait}
                  </span>
                ))}
              </div>
              
              {/* Chat button placed with traits */}
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const message = `${agent.name}!! sup how are we doing?`;
                    const url = `https://warpcast.com/~/compose?text=@tonty.eth ${encodeURIComponent(message)}`;
                    window.open(url, '_blank');
                  }}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] text-white font-bold flex items-center justify-center space-x-2 mt-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Chat with {agent.name}</span>
                </motion.button>
              </div>
            </div>
            
            {/* <div className="flex flex-col items-end">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-bold text-lg">+{Math.floor(Math.random() * 100)}%</span>
              </div>
              <div className="text-gray-400 text-sm">24h change</div>
            </div> */}
          </div>
        </div>


        {/* Agent Bio */}
        <div className="glassmorphic rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">About {agent.name}</h2>
          <div className="space-y-4">
            {agent.bio.map((paragraph, index) => (
              <p key={index} className="text-gray-300">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Token Chart */}
        <div className="glassmorphic rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Token Performance</h2>
            {/* <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const message = `${agent.name}!! sup how are we doing?`;
                  const url = `https://warpcast.com/~/compose?text=@tonty.eth ${encodeURIComponent(message)}`;
                  window.open(url, '_blank');
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] text-white font-bold flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </motion.button>
            </div> */}
          </div>
          <TokenChart agentName={agent.name} />
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-1">Market Cap</div>
              <div className="font-bold text-lg">${(Math.random() * 10000000).toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-1">Volume (24h)</div>
              <div className="font-bold text-lg">${(Math.random() * 1000000).toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-1">Holders</div>
              <div className="font-bold text-lg">{Math.floor(Math.random() * 10000)}</div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
} 
"use client"

import { motion } from 'framer-motion'
import { Rocket, TrendingUp, Users, ArrowRight, MessageCircle, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Agent } from '@/components/AgentCard'
import { TokenCard } from '@/components/TokenCard'
import { FeaturedToken } from '@/components/FeaturedToken'
import { fetchAgents } from './utils/api'

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [agents, setAgents] = useState<Agent[]>([])
  const [featuredAgent, setFeaturedAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX - window.innerWidth / 2) / 50,
        y: (e.clientY - window.innerHeight / 2) / 50,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    async function loadAgents() {
      setIsLoading(true)
      try {
        const agentsData = await fetchAgents()
        setAgents(agentsData)
        
        // Select a random agent as featured
        if (agentsData.length > 0) {
          const randomIndex = Math.floor(Math.random() * agentsData.length)
          setFeaturedAgent(agentsData[randomIndex])
        }
      } catch (error) {
        console.error('Failed to load agents:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAgents()
  }, [])

  // Function to open Warpcast compose URL
  const openWarpcastCompose = (agentName: string) => {
    const message = `${agentName}!! sup how are we doing?`;
    const url = `https://warpcast.com/~/compose?text=@tonty.eth ${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {/* Animated gradient orbs */}
        <motion.div 
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-600/30 to-blue-600/20 blur-3xl"
          animate={{
            x: [0, 100, 50, 200, 0],
            y: [0, 200, 100, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          style={{ top: '-100px', right: '-100px' }}
        />
        <motion.div 
          className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-r from-blue-600/20 to-pink-600/20 blur-3xl"
          animate={{
            x: [0, -100, -50, -150, 0],
            y: [0, 100, 200, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          style={{ bottom: '-50px', left: '-100px' }}
        />
      </div>
      
      {/* Tokens Section */}
      <section className="py-12 px-4 min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center mt-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl font-bold font-orbitron text-gradient mb-4"
            >
              Available Tokens
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              Explore our collection of tokens for your next memecoin
            </motion.p>
            
            {/* Create Token Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/create')}
              className="mt-6 px-6 py-3 rounded-lg bg-white/10 border border-white/20 text-white font-bold flex items-center space-x-2 mx-auto"
            >
              <Plus size={18} />
              <span>Create Your Token</span>
            </motion.button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#32A9FF]"></div>
            </div>
          ) : (
            <>
              {/* Featured Token */}
              {featuredAgent && <FeaturedToken agent={featuredAgent} />}
              
              {/* Token Grid */}
              {agents.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-gray-400">No tokens available at the moment. Please check back later.</p>
                </div>
              ) : (
                <>
                  {/* Search and Sort */}
                  <div className="flex flex-col md:flex-row justify-between mb-6">
                    <div className="relative mb-4 md:mb-0 md:w-1/3">
                      <input
                        type="text"
                        placeholder="Search by name, symbol, or creator..."
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A9FF]"
                      />
                    </div>
                    <div className="relative md:w-1/4">
                      <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#32A9FF]">
                        <option>Newest First</option>
                        <option>Oldest First</option>
                        <option>Highest Rewards</option>
                        <option>Most Stakers</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((agent, index) => (
                      <motion.div
                        key={agent.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <TokenCard agent={agent} />
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          
          {/* CTA Button */}
          {featuredAgent && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openWarpcastCompose(featuredAgent.name)}
              className="mt-12 mx-auto px-8 py-4 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] text-white font-bold text-lg flex items-center space-x-2 group block"
            >
              <span>Chat with {featuredAgent.name}</span>
              <MessageCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </motion.button>
          )}
        </div>
      </section>
    </main>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-2xl font-bold mb-2 font-orbitron">{value}</h3>
      <p className="text-gray-400">{label}</p>
    </div>
  )
}
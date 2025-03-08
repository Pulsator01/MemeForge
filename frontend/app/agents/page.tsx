"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchAgents } from '../utils/api'
import { AgentCard, Agent } from '@/components/AgentCard'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadAgents() {
      setIsLoading(true)
      try {
        const agentsData = await fetchAgents()
        setAgents(agentsData)
      } catch (error) {
        console.error('Failed to load agents:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAgents()
  }, [])

  return (
    <main className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-orbitron text-gradient mb-4">
            Memegents Agents
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Explore our collection of AI-powered agents for your next memecoin
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#32A9FF]"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400">No agents available at the moment. Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AgentCard agent={agent} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
} 
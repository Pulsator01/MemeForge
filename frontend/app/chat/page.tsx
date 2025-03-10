"use client"

import React, { useState, useRef, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader, ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchAgentDetails } from '../utils/api'
import { Agent } from '@/components/AgentCard'

// Get API URL from environment variable
const API_URL = process.env.API_URL || 'https://memegents-102364148288.us-central1.run.app/';

interface Message {
  id: string
  content: string
  type: 'user' | 'ai'
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActualChatPage />
    </Suspense>
  );
}

function ActualChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoadingAgent, setIsLoadingAgent] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const agentName = searchParams.get('agent')

  useEffect(() => {
    async function loadAgent() {
      if (!agentName) {
        setIsLoadingAgent(false)
        return
      }

      try {
        const agentData = await fetchAgentDetails(agentName)
        setAgent(agentData)
        
        if (agentData) {
          // Add initial message from the agent
          setMessages([
            {
              id: '1',
              content: `Hello! I'm ${agentData.name}. ${agentData.bio[0].split(',')[1] || 'How can I help you today?'}`,
              type: 'ai'
            }
          ])
        }
      } catch (error) {
        console.error('Failed to load agent:', error)
      } finally {
        setIsLoadingAgent(false)
      }
    }

    loadAgent()
  }, [agentName])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: 'user'
    }

    setMessages(prev => [...prev, newMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call the API
      const response = await fetch(`${API_URL}api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input,
          agent: agent?.name || 'Memegents'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "I'm sorry, I couldn't process your request at this time.",
        type: 'ai'
      }
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, there was an error processing your request. Please try again later.",
        type: 'ai'
      }
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  if (isLoadingAgent) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#32A9FF]"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen pt-16">
      <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
        {/* Chat Header */}
        <div className="glassmorphic p-4 rounded-t-lg">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className="mr-4 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-orbitron text-gradient text-center flex-1">
              {agent ? `Chat with ${agent.name}` : 'Memegents Chat Assistant'}
            </h1>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex items-start space-x-3 ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-[#32A9FF] to-[#BB40FF]' 
                    : 'bg-gradient-to-r from-[#BB40FF] to-[#44FFA1]'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>
                <div className={`flex-1 glassmorphic rounded-lg p-4 ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-[#32A9FF]/10 to-transparent border-[#32A9FF]/20' 
                    : 'bg-gradient-to-r from-[#BB40FF]/10 to-transparent border-[#BB40FF]/20'
                }`}>
                  <p className="text-sm md:text-base whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start space-x-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#BB40FF] to-[#44FFA1] flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1 glassmorphic rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-400">AI is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 glassmorphic rounded-b-lg">
          <form onSubmit={handleSubmit} className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${agent?.name || 'Memegents'}...`}
                className="w-full bg-black/20 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#32A9FF]/50 resize-none"
                rows={1}
                style={{
                  minHeight: '2.5rem',
                  maxHeight: '10rem'
                }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-3 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] text-white font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </form>
        </div>
      </div>
    </main>
  )
}
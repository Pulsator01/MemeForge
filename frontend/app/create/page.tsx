"use client"

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CreateTokenForm } from '@/components/CreateTokenForm'

export default function CreateTokenPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen pt-20 pb-12 px-4 relative overflow-hidden">
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
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tokens</span>
        </button>

        {/* Create Token Form */}
        <CreateTokenForm />
      </div>
    </main>
  )
} 
"use client"

import { motion } from 'framer-motion'
import { Rocket, TrendingUp, Users, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
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

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background" />
        
        {/* Floating 3D Elements */}
        <motion.div
          className="absolute"
          animate={{
            x: mousePosition.x,
            y: mousePosition.y,
            rotateX: mousePosition.y * 2,
            rotateY: mousePosition.x * 2,
          }}
        >
          <div className="grid grid-cols-2 gap-8">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-32 h-32 rounded-2xl glassmorphic neon-border float-animation"
                animate={{
                  y: [0, 20, 0],
                }}
                transition={{
                  duration: 4,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <div className="relative z-10 text-center px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold mb-6 font-orbitron text-gradient"
          >
            Launch Your Next Memecoin
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto"
          >
            The most secure and advanced launchpad platform for the next generation of memecoins
          </motion.p>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glassmorphic rounded-2xl p-8 max-w-3xl mx-auto mb-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard
                icon={<Rocket className="w-8 h-8 text-[#32A9FF]" />}
                value="1,234+"
                label="Tokens Launched"
              />
              <StatCard
                icon={<TrendingUp className="w-8 h-8 text-[#BB40FF]" />}
                value="$42M+"
                label="Total Value Locked"
              />
              <StatCard
                icon={<Users className="w-8 h-8 text-[#44FFA1]" />}
                value="50K+"
                label="Active Users"
              />
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/chat')}
            className="px-8 py-4 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] text-white font-bold text-lg flex items-center justify-center mx-auto space-x-2 group"
          >
            <span>Launch Your Token</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
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
"use client"

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Rocket, Wallet, Menu } from 'lucide-react'
import { connectWallet, disconnectWallet } from '../app/utils/web3'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>('');

  const handleConnect = async () => {
    try {
      const wallet = await connectWallet();
      if (wallet && wallet.address) {
        setWalletAddress(wallet.address);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWalletAddress('');
  };

  return (
    <nav className="fixed w-full z-50 glassmorphic">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Rocket className="h-8 w-8 text-[#32A9FF]" />
              <span className="text-xl font-bold font-orbitron text-gradient">
                Memegents
              </span>
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-8">
              <NavLink href="/agents">All Memegents</NavLink>
              {/* <NavLink href="/tokens">Mem</NavLink> */}
              {/* <NavLink href="/chat">Chat</NavLink> */}
              {!walletAddress ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] text-white font-semibold flex items-center space-x-2"
                  onClick={handleConnect}
                >
                  <Wallet className="h-4 w-4" />
                  <span>Connect Wallet</span>
                </motion.button>
              ) : (
                <div className="flex items-center space-x-4">
                  <p className="text-white font-mono text-sm">{walletAddress}</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden glassmorphic">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <MobileNavLink href="/agents">All Memegents</MobileNavLink>
            {/* <MobileNavLink href="/tokens">Tokens</MobileNavLink> */}
            {/* <MobileNavLink href="/chat">Chat</MobileNavLink> */}
            {!walletAddress ? (
              <button
                onClick={handleConnect}
                className="w-full mt-4 px-6 py-2 rounded-lg bg-gradient-to-r from-[#32A9FF] to-[#BB40FF] text-white font-semibold flex items-center justify-center space-x-2"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </button>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <p className="text-white font-mono text-sm">{walletAddress}</p>
                <button
                  onClick={handleDisconnect}
                  className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium relative group"
    >
      <span className="relative z-10">{children}</span>
      <motion.div
        className="absolute inset-0 bg-white/5 rounded-md -z-10"
        initial={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    </Link>
  )
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
    >
      {children}
    </Link>
  )
}

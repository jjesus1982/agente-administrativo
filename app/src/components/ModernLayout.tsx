"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import ModernSidebar from './ModernSidebar'
import ModernHeader from './ModernHeader'

interface ModernLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export default function ModernLayout({ children, title, subtitle }: ModernLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // 📱 Detect mobile breakpoint with improved logic
  useEffect(() => {
    const checkMobile = () => {
      const isMobileSize = window.innerWidth < 768
      console.log('📱 Mobile detection:', { width: window.innerWidth, isMobile: isMobileSize })

      setIsMobile(isMobileSize)

      // Auto close mobile sidebar on desktop AND force close on initial desktop load
      if (!isMobileSize) {
        console.log('🖥️ Desktop detected, closing sidebar')
        setSidebarOpen(false)
      }
    }

    // Initial check
    checkMobile()

    // Force close sidebar on component mount if desktop
    if (window.innerWidth >= 768) {
      setSidebarOpen(false)
    }

    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 🚪 Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isMobile && sidebarOpen && !target.closest('[data-sidebar]') && !target.closest('[data-mobile-menu]')) {
        console.log('🖱️ Clicked outside sidebar, closing')
        setSidebarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobile, sidebarOpen])

  // 🔍 Debug state changes
  useEffect(() => {
    console.log('🔄 Layout state:', { isMobile, sidebarOpen, backdropVisible: isMobile && sidebarOpen })

    // Extra safety: if backdrop is visible on desktop, force close
    if (!isMobile && sidebarOpen) {
      console.log('⚠️ Safety: Sidebar open on desktop, force closing')
      setSidebarOpen(false)
    }
  }, [isMobile, sidebarOpen])

  // 🎨 Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  const contentVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.1
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 📱 Mobile backdrop with debug protection */}
      <AnimatePresence mode="wait">
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => {
              console.log('🔽 Backdrop clicked, closing sidebar')
              setSidebarOpen(false)
            }}
            onAnimationComplete={(definition) => {
              if (definition === "exit") {
                console.log('✅ Backdrop animation exit complete')
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* 🗂️ Sidebar */}
      <div data-sidebar className="relative z-50">
        <ModernSidebar
          isMobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* 📄 Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 🎯 Header */}
        <ModernHeader
          onMobileMenuToggle={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
        />

        {/* 📋 Main Content */}
        <motion.main
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/20"
        >
          <motion.div
            variants={contentVariants}
            className="container mx-auto p-6 space-y-6"
          >
            {/* ✨ Content wrapper with glass effect */}
            <motion.div
              className={cn(
                "min-h-full rounded-2xl",
                "bg-gradient-to-br from-background/80 via-background/60 to-background/40",
                "backdrop-blur-sm border border-border/50",
                "shadow-2xl shadow-primary/5"
              )}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="p-6 md:p-8">
                {children}
              </div>
            </motion.div>
          </motion.div>

          {/* 🌟 Floating elements for visual depth */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <motion.div
              className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
              animate={{
                x: [0, 30, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"
              animate={{
                x: [0, -40, 0],
                y: [0, 40, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.main>
      </div>

      {/* 🎭 Global animations styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 4s ease-in-out infinite;
        }

        /* Custom scrollbar for content area */
        .scrollbar-modern::-webkit-scrollbar {
          width: 8px;
        }

        .scrollbar-modern::-webkit-scrollbar-track {
          background: hsl(var(--muted) / 0.1);
          border-radius: 4px;
        }

        .scrollbar-modern::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .scrollbar-modern::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }

        /* Smooth focus transitions */
        * {
          scroll-behavior: smooth;
        }

        /* Enhanced focus styles for accessibility */
        .focus-ring-modern:focus {
          outline: none;
          ring: 2px solid hsl(var(--ring));
          ring-offset: 2px;
          transition: all 0.2s ease;
        }

        /* Glass morphism backdrop filter support */
        @supports (backdrop-filter: blur(16px)) {
          .glass-supported {
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
          }
        }

        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .glass-card {
            border-width: 2px;
            background: hsl(var(--background));
          }
        }

        /* Dark theme adjustments */
        .dark {
          color-scheme: dark;
        }

        /* Print styles */
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

// 🎨 Export layout wrapper components
export function ModernPageWrapper({
  children,
  title,
  subtitle,
  className
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("space-y-6", className)}
    >
      {(title || subtitle) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-2"
        >
          {title && (
            <h1 className="text-fluid-2xl font-bold text-foreground">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-fluid-lg text-muted-foreground">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export { ModernLayout }
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import InviteCodeCard from '@/components/collaborative/InviteCodeCard';
import JoinByCodeForm from '@/components/collaborative/JoinByCodeForm';

export default function CollaborativeLobbyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/notes')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to notes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-xl">🤝</span>
                <h1 className="text-lg font-medium text-gray-900">Collaborative Notes</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Start Collaborating
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Work together in real-time on shared notes. Create an invite code to host a session, 
            or join someone else's collaborative note using their code.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('host')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'host'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Host Session
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'join'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Join Session
            </button>
          </div>
        </motion.div>

        {/* Content */}
        <div className="max-w-md mx-auto">
          {activeTab === 'host' ? (
            <motion.div
              key="host"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <InviteCodeCard />
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <JoinByCodeForm />
            </motion.div>
          )}
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <h3 className="text-xl font-semibold text-gray-900 text-center mb-8">
            Collaborative Features
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h4 className="font-medium text-gray-900 mb-2">Real-time Editing</h4>
              <p className="text-sm text-gray-600">
                See changes instantly as you and your collaborators type
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">👥</div>
              <h4 className="font-medium text-gray-900 mb-2">Live Cursors</h4>
              <p className="text-sm text-gray-600">
                See where others are editing with colored cursor indicators
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">💾</div>
              <h4 className="font-medium text-gray-900 mb-2">Auto-save</h4>
              <p className="text-sm text-gray-600">
                Your work is automatically saved every minute and on blur
              </p>
            </div>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-blue-50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How it works
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>To host:</strong> Generate your unique invite code and share it with collaborators</p>
            <p><strong>To join:</strong> Enter someone's invite code to join their collaborative note</p>
            <p><strong>Editing:</strong> Once connected, you can both edit the same document in real-time</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
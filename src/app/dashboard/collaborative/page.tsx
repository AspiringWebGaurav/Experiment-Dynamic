'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  ArrowRight, 
  Clock, 
  UserPlus,
  Share2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import InviteCodeCard from '@/components/collaborative/InviteCodeCard';
import JoinByCodeForm from '@/components/collaborative/JoinByCodeForm';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';

interface CollaborativeSession {
  id: string;
  noteId: string;
  title: string;
  createdBy: string;
  status: 'waiting' | 'active' | 'ended';
  createdAt: any;
  updatedAt: any;
  memberCount: number;
}

export default function CollaborativePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');
  const [sessions, setSessions] = useState<CollaborativeSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Listen for user's collaborative sessions
      const lobbiesRef = ref(rtdb, 'lobbies');
      const userLobbiesQuery = query(
        lobbiesRef,
        orderByChild('createdBy'),
        equalTo(user.uid)
      );

      const unsubscribe = onValue(userLobbiesQuery, (snapshot) => {
        const lobbiesData = snapshot.val();
        const sessionsList: CollaborativeSession[] = [];

        if (lobbiesData) {
          Object.entries(lobbiesData).forEach(([id, data]: [string, any]) => {
            sessionsList.push({
              id,
              noteId: data.noteId,
              title: data.title || 'Collaborative Note',
              createdBy: data.createdBy,
              status: data.status,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              memberCount: data.memberCount || 1
            });
          });
        }

        setSessions(sessionsList.sort((a, b) => 
          (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
        ));
        setLoadingSessions(false);
      });

      return () => unsubscribe();
    }
  }, [user, loading, router]);

  const createNewSession = () => {
    // Navigate to the collaborative notes creation page
    router.push('/notes/collaborative');
  };

  const joinSession = (noteId: string) => {
    router.push(`/notes/collaborative/${noteId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="gap-2"
              >
                ← Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-semibold">Collaborative Notes</h1>
                <Badge variant="secondary">Beta</Badge>
              </div>
            </div>
            <Button onClick={createNewSession} className="gap-2">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Real-time Collaboration</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Work together in real-time on shared notes. Create an invite code to host a session, 
            or join someone else's collaborative note using their code.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('host')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'host'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Share2 className="h-4 w-4 inline mr-2" />
              Host Session
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'join'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="h-4 w-4 inline mr-2" />
              Join Session
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Host/Join Forms */}
          <div>
            {activeTab === 'host' ? (
              <motion.div
                key="host"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <InviteCodeCard />
              </motion.div>
            ) : (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <JoinByCodeForm />
              </motion.div>
            )}
          </div>

          {/* Right Column - Recent Sessions */}
          <div>
            <Card className="bg-white/60 dark:bg-slate-900/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Sessions
                </CardTitle>
                <CardDescription>
                  Your collaborative notes history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      No collaborative sessions yet
                    </p>
                    <Button onClick={createNewSession} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Start Your First Session
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => joinSession(session.noteId)}
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {session.title}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {session.status === 'active' ? 'Active' : 'Ended'} • {session.memberCount} member{session.memberCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={session.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {session.status}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Share2 className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold">Host a Session</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Create an invite code and share it with others to start collaborating.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab('host')}
                className="w-full"
              >
                Generate Code
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <UserPlus className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold">Join a Session</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Enter an invite code to join someone else's collaborative note.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab('join')}
                className="w-full"
              >
                Enter Code
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Plus className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold">New Session</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Start a new collaborative note session right away.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={createNewSession}
                className="w-full"
              >
                Create Now
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
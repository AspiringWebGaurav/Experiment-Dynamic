'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import CollaborativeEditorFull from '@/components/collaborative/CollaborativeEditorFull';
import PresenceChips from '@/components/collaborative/PresenceChips';
import { CollabNote } from '@/types';

export default function CollaborativeNotePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const noteId = params['noteId'] as string;
  
  const [note, setNote] = useState<CollabNote | null>(null);
  const [noteLoading, setNoteLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !noteId) return;

    const checkAccess = async () => {
      try {
        // Check if user has access to this collaborative note
        const memberDoc = await getDoc(doc(db, 'collabNotes', noteId, 'members', user.uid));
        
        if (!memberDoc.exists()) {
          setError('You do not have access to this collaborative note.');
          setNoteLoading(false);
          return;
        }

        setHasAccess(true);

        // Get note details
        const noteDoc = await getDoc(doc(db, 'collabNotes', noteId));
        
        if (!noteDoc.exists()) {
          setError('Collaborative note not found.');
          setNoteLoading(false);
          return;
        }

        const noteData = noteDoc.data() as CollabNote;
        setNote({ ...noteData, id: noteDoc.id });
        setNoteLoading(false);
      } catch (err) {
        console.error('Error checking note access:', err);
        setError('Failed to load collaborative note.');
        setNoteLoading(false);
      }
    };

    checkAccess();
  }, [user, noteId]);

  const handleTitleChange = async (newTitle: string) => {
    if (!note || !user) return;

    try {
      await updateDoc(doc(db, 'collabNotes', noteId), {
        title: newTitle,
        updatedAt: new Date()
      });
      
      setNote(prev => prev ? { ...prev, title: newTitle } : null);
    } catch (err) {
      console.error('Error updating note title:', err);
    }
  };

  const handleBackToLobby = () => {
    router.push('/notes/collaborative');
  };

  const handleBackToNotes = () => {
    router.push('/dashboard/notes');
  };

  if (loading || noteLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-sm border border-red-200 p-8 max-w-md w-full mx-4"
        >
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">🚫</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={handleBackToLobby}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Lobby
              </button>
              <button
                onClick={handleBackToNotes}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                All Notes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!hasAccess || !note) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collaborative note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToLobby}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to collaborative lobby"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-xl">🤝</span>
                <h1 className="text-lg font-medium text-gray-900 truncate max-w-xs">
                  {note.title}
                </h1>
              </div>
            </div>

            {/* Presence indicators */}
            <div className="flex items-center space-x-4">
              <PresenceChips noteId={noteId} />
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBackToNotes}
                  className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                >
                  All Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Collaborative Editor */}
          <CollaborativeEditorFull
            noteId={noteId}
            onTitleChange={handleTitleChange}
          />

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-sm text-gray-500"
          >
            <p>
              This is a collaborative note. Changes are saved automatically and synced in real-time.
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
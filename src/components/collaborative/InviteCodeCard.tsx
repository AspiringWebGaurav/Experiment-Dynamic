'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp as firestoreServerTimestamp 
} from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function InviteCodeCard() {
  const { user } = useAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [noteId, setNoteId] = useState<string>('');
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (user) {
      generateInviteCode();
    }
  }, [user]);

  const generateBase36Code = (length: number): string => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  const createUniqueCode = async (): Promise<string> => {
    const maxRetries = 10;
    let attempts = 0;
    let codeLength = 4;

    while (attempts < maxRetries) {
      const code = generateBase36Code(codeLength);
      
      const inviteCodesRef = collection(db, 'inviteCodes');
      const codeQuery = query(inviteCodesRef, where('code', '==', code));
      const snapshot = await getDocs(codeQuery);
      
      if (snapshot.empty) {
        return code;
      }
      
      attempts++;
      
      if (attempts === 5) {
        codeLength = 5;
      } else if (attempts === 8) {
        codeLength = 6;
      }
    }
    
    throw new Error('Failed to generate unique invite code');
  };

  const generateInviteCode = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const userProfileRef = doc(db, 'profiles', user.uid);
      const profileSnapshot = await getDoc(userProfileRef);
      
      if (profileSnapshot.exists()) {
        const profileData = profileSnapshot.data();
        if (profileData?.['inviteCodeId']) {
          const inviteCodesRef = collection(db, 'inviteCodes');
          const existingCodeQuery = query(
            inviteCodesRef,
            where('code', '==', profileData['inviteCodeId']),
            where('active', '==', true)
          );
          const existingCodeSnapshot = await getDocs(existingCodeQuery);
          
          if (!existingCodeSnapshot.empty) {
            setInviteCode(profileData['inviteCodeId']);
            setLoading(false);
            return;
          }
        }
      }

      const code = await createUniqueCode();
      
      // Generate unique note ID for the collaborative session
      const noteId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create collaborative note in Firestore
      const noteRef = doc(db, 'collabNotes', noteId);
      await setDoc(noteRef, {
        title: 'Collaborative Note',
        createdBy: user.uid,
        createdAt: firestoreServerTimestamp(),
        updatedAt: firestoreServerTimestamp(),
        status: 'active',
        protectionMode: 'public'
      });
      
      // Add host as owner member
      const hostMemberRef = doc(db, 'collabNotes', noteId, 'members', user.uid);
      await setDoc(hostMemberRef, {
        uid: user.uid,
        role: 'owner',
        addedAt: firestoreServerTimestamp(),
        status: 'active'
      });
      
      const codeRef = doc(db, 'inviteCodes', code);
      await setDoc(codeRef, {
        code: code,
        ownerUid: user.uid,
        noteId: noteId, // Link the invite code to the collaborative note
        active: true,
        createdAt: firestoreServerTimestamp(),
        expiresAt: null
      });
      
      const firstName = user.displayName?.split(' ')[0] || 'Anonymous';
      await setDoc(userProfileRef, {
        uid: user.uid,
        firstName,
        avatarUrl: user.photoURL || null,
        inviteCodeId: code,
        createdAt: firestoreServerTimestamp(),
        updatedAt: firestoreServerTimestamp()
      }, { merge: true });

      setInviteCode(code);
      setNoteId(noteId);
      
      // Auto-redirect Person A to the collaborative note after creating invite code
      setRedirecting(true);
      setTimeout(() => {
        router.push(`/notes/collaborative/${noteId}`);
      }, 1500); // Give user time to see the invite code before redirecting
      
    } catch (err: any) {
      console.error('Error generating invite code:', err);
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please try again or contact support.');
      } else if (err.code === 'unavailable') {
        setError('Service temporarily unavailable. Please try again.');
      } else {
        setError(err.message || 'Failed to generate invite code');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const refreshCode = () => {
    generateInviteCode();
  };

  const startCollaborating = () => {
    if (noteId) {
      router.push(`/notes/collaborative/${noteId}`);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Generating your invite code...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-red-200 p-6"
      >
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refreshCode}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  if (redirecting) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-sm border border-green-200 p-6"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-6"
          />
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            🚀 Launching Collaboration!
          </h3>
          
          <p className="text-gray-600 mb-4">
            Your invite code <span className="font-mono font-bold text-blue-600">{inviteCode}</span> is ready!
          </p>
          
          <p className="text-sm text-gray-500">
            Redirecting you to the collaborative note...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Invite Code</h3>
        <p className="text-gray-600 mb-4">Share this code with someone to start collaborating</p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-3xl font-mono font-bold text-blue-600 tracking-wider">
            {inviteCode}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={copyToClipboard}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copied ? (
              <span>✓ Copied!</span>
            ) : (
              <span>📋 Copy Code</span>
            )}
          </button>
          
          <button
            onClick={refreshCode}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span>🔄 Refresh</span>
          </button>
        </div>

        {noteId && (
          <div className="mt-4">
            <button
              onClick={startCollaborating}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <span>🚀 Start Collaborating</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
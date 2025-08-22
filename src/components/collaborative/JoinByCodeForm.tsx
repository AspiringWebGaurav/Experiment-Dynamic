'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp as firestoreServerTimestamp,
  updateDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function JoinByCodeForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [handshaking, setHandshaking] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !code.trim()) return;

    const trimmedCode = code.trim().toLowerCase();
    
    // Validate code format
    if (trimmedCode.length < 4 || trimmedCode.length > 6) {
      setError('Invite code must be 4-6 characters long');
      return;
    }

    if (!/^[0-9a-z]+$/.test(trimmedCode)) {
      setError('Invite code can only contain letters and numbers');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Look for invite code in Firestore
      const inviteCodesRef = collection(db, 'inviteCodes');
      const codeQuery = query(inviteCodesRef, where('code', '==', trimmedCode), where('active', '==', true));
      const codeSnapshot = await getDocs(codeQuery);
      
      if (codeSnapshot.empty) {
        setError('Invite code not found. Please check the code and try again.');
        setLoading(false);
        return;
      }
      
      const codeDoc = codeSnapshot.docs[0];
      if (!codeDoc) {
        setError('Invite code not found. Please check the code and try again.');
        setLoading(false);
        return;
      }
      
      const codeData = codeDoc.data();
      const hostUid = codeData['ownerUid'];
      const noteId = codeData['noteId']; // Use existing noteId from invite code
      
      if (hostUid === user.uid) {
        setError('You cannot join your own invite code.');
        setLoading(false);
        return;
      }

      if (!noteId) {
        setError('Invalid invite code. No collaborative session found.');
        setLoading(false);
        return;
      }

      // Verify the collaborative note exists
      const noteRef = doc(db, 'collabNotes', noteId);
      const noteDoc = await getDoc(noteRef);
      
      if (!noteDoc.exists()) {
        setError('Collaborative session not found. Please ask for a new invite code.');
        setLoading(false);
        return;
      }
      
      // Add joiner as editor
      const joinerMemberRef = doc(db, 'collabNotes', noteId, 'members', user.uid);
      await setDoc(joinerMemberRef, {
        uid: user.uid,
        role: 'editor',
        addedAt: firestoreServerTimestamp(),
        status: 'active'
      });

      // Create user profiles if they don't exist
      const joinerFirstName = user.displayName?.split(' ')[0] || 'Anonymous';
      const joinerProfileRef = doc(db, 'profiles', user.uid);
      const joinerProfileDoc = await getDoc(joinerProfileRef);
      
      if (!joinerProfileDoc.exists()) {
        await setDoc(joinerProfileRef, {
          uid: user.uid,
          firstName: joinerFirstName,
          avatarUrl: user.photoURL || null,
          createdAt: firestoreServerTimestamp(),
          updatedAt: firestoreServerTimestamp()
        });
      }

      // Update invite code usage tracking
      if (codeDoc) {
        await updateDoc(codeDoc.ref, {
          usedAt: firestoreServerTimestamp(),
          usedBy: user.uid,
          usageCount: (codeData['usageCount'] || 0) + 1
        });
      }

      // Start handshaking animation
      setHandshaking(true);
      setLoading(false);
      
      // Countdown animation
      let count = 3;
      setCountdown(count);
      
      const countdownInterval = setInterval(() => {
        count--;
        setCountdown(count);
        
        if (count <= 0) {
          clearInterval(countdownInterval);
          // Navigate to collaborative editor
          router.push(`/notes/collaborative/${noteId}`);
        }
      }, 1000);

    } catch (err: any) {
      console.error('Error joining by code:', err);
      setLoading(false);
      
      // Provide more specific error messages
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please try again or contact support.');
      } else if (err.code === 'unavailable') {
        setError('Service temporarily unavailable. Please try again.');
      } else {
        setError('Failed to join collaborative session. Please try again.');
      }
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^0-9a-z]/g, '');
    if (value.length <= 6) {
      setCode(value);
      setError('');
    }
  };

  if (handshaking) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"
          />
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Handshaking...
          </h3>
          
          <p className="text-gray-600 mb-6">
            Connecting to collaborative session
          </p>
          
          <motion.div
            key={countdown}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-4xl font-bold text-blue-600"
          >
            {countdown}
          </motion.div>
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
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">🤝</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Join Collaboration</h3>
        <p className="text-gray-600">Enter an invite code to join a collaborative note</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
            Invite Code
          </label>
          <input
            id="inviteCode"
            type="text"
            value={code}
            onChange={handleCodeChange}
            placeholder="Enter 4-6 character code"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider uppercase"
            disabled={loading}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 mt-1">
            Code should be 4-6 characters (letters and numbers only)
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-3"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading || !code.trim() || code.length < 4}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Joining...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span>Join Collaboration</span>
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
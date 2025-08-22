'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { PresenceData } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface PresenceChipsProps {
  noteId: string;
}

export default function PresenceChips({ noteId }: PresenceChipsProps) {
  const { user } = useAuth();
  const [presenceData, setPresenceData] = useState<Record<string, PresenceData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noteId || !user) return;

    const presenceRef = ref(rtdb, `rt-presence/${noteId}`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Filter out stale presence data (older than 2 minutes)
        const now = Date.now();
        const filtered: Record<string, PresenceData> = {};
        
        Object.entries(data).forEach(([uid, presence]: [string, any]) => {
          if (presence && presence.lastSeen) {
            const lastSeen = typeof presence.lastSeen === 'number' 
              ? presence.lastSeen 
              : new Date(presence.lastSeen).getTime();
            
            // Keep presence data if it's less than 2 minutes old
            if (now - lastSeen < 120000) {
              filtered[uid] = presence as PresenceData;
            }
          }
        });
        
        setPresenceData(filtered);
      } else {
        setPresenceData({});
      }
      setLoading(false);
    });

    return () => {
      off(presenceRef, 'value', unsubscribe);
    };
  }, [noteId, user]);

  const activeUsers = Object.entries(presenceData).filter(([uid]) => uid !== user?.uid);
  const currentUser = user?.uid ? presenceData[user.uid] : null;

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8"></div>
        <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Current user indicator */}
      {currentUser && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative"
        >
          <div
            className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: currentUser.color }}
            title={`${currentUser.firstName} (You)`}
          >
            {currentUser.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </motion.div>
      )}

      {/* Other active users */}
      <AnimatePresence>
        {activeUsers.map(([uid, presence]) => (
          <motion.div
            key={uid}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="relative"
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: presence.color }}
              title={presence.firstName}
            >
              {presence.firstName.charAt(0).toUpperCase()}
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Active users count */}
      {activeUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm text-gray-600 ml-2"
        >
          {activeUsers.length === 1
            ? `${activeUsers[0]?.[1]?.firstName || 'Someone'} is editing`
            : `${activeUsers.length} people editing`
          }
        </motion.div>
      )}

      {/* No other users indicator */}
      {activeUsers.length === 0 && currentUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-500 ml-2"
        >
          You're editing alone
        </motion.div>
      )}
    </div>
  );
}

// Typing indicator component for showing who's currently typing
export function TypingIndicator({ noteId }: { noteId: string }) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!noteId || !user) return;

    const presenceRef = ref(rtdb, `rt-presence/${noteId}`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const typing: string[] = [];
        
        Object.entries(data).forEach(([uid, presence]: [string, any]) => {
          if (uid !== user.uid && presence?.typing && presence?.firstName) {
            typing.push(presence.firstName);
          }
        });
        
        setTypingUsers(typing);
      } else {
        setTypingUsers([]);
      }
    });

    return () => {
      off(presenceRef, 'value', unsubscribe);
    };
  }, [noteId, user]);

  if (typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center space-x-2 text-sm text-gray-500 px-4 py-2"
    >
      <div className="flex space-x-1">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
      </div>
      <span>
        {typingUsers.length === 1
          ? `${typingUsers[0]} is typing...`
          : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`
        }
      </span>
    </motion.div>
  );
}
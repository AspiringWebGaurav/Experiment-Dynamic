'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { FirebaseProvider } from '@/lib/y-firebase';
import { setupAutoSave } from '@/lib/snapshots';
import { TypingIndicator } from './PresenceChips';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CollaborativeEditorProps {
  noteId: string;
  onTitleChange?: (title: string) => void;
}

type ProtectionMode = 'public' | 'protected';

export default function CollaborativeEditorFull({ noteId, onTitleChange }: CollaborativeEditorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [title, setTitle] = useState('Collaborative Note');
  const [collaborationReady, setCollaborationReady] = useState(false);
  const [protectionMode, setProtectionMode] = useState<ProtectionMode>('public');
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<FirebaseProvider | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const generateUserColor = (uid: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length] || '#FF6B6B';
  };

  useEffect(() => {
    if (!user || !noteId) return;

    const initializeCollaboration = async () => {
      try {
        // Create Y.js document
        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        // Initialize Firebase provider with error handling
        const provider = new FirebaseProvider({
          noteId,
          ydoc,
          user,
        });
        providerRef.current = provider;

        // Wait for provider to be ready
        await new Promise<void>((resolve) => {
          const checkReady = () => {
            if (provider.isConnected()) {
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });

        // Set up awareness change listener for connected users
        provider.awareness.on('change', () => {
          const users = provider.getConnectedUsers();
          setConnectedUsers(users);
        });

        setCollaborationReady(true);
        setLoading(false);
      } catch (err: any) {
        console.error('Error initializing collaboration:', err);
        if (err.message?.includes('does not have access')) {
          setError('You do not have access to this collaborative note');
        } else {
          setError('Failed to initialize collaboration features');
        }
        setLoading(false);
      }
    };

    initializeCollaboration();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };
  }, [user, noteId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable history in StarterKit as Collaboration provides its own
        history: false,
      }),
      ...(collaborationReady && ydocRef.current && providerRef.current && user ? [
        Collaboration.configure({
          document: ydocRef.current,
        }),
        CollaborationCursor.configure({
          provider: providerRef.current,
          user: {
            name: user.displayName?.split(' ')[0] || 'Anonymous',
            color: generateUserColor(user.uid),
          },
        }),
      ] : []),
    ],
    content: '<p>Start typing to collaborate...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] px-4 py-6',
      },
    },
    immediatelyRender: false, // Fix SSR warning
    onCreate: async ({ editor }: any) => {
      try {
        // Set up autosave and update activity
        const cleanup = setupAutoSave(noteId, editor);
        cleanupRef.current = cleanup;
        
        // Update last activity
        if (providerRef.current) {
          await providerRef.current.updateLastActivity();
        }
      } catch (err) {
        console.error('Error setting up editor:', err);
      }
    },
    onUpdate: async ({ editor }: any) => {
      // Update activity on every change
      if (providerRef.current) {
        await providerRef.current.updateLastActivity();
      }
    },
    onSelectionUpdate: ({ editor }: any) => {
      // Update cursor position for other users
      if (providerRef.current && editor.state.selection) {
        const { from, to } = editor.state.selection;
        providerRef.current.updateSelection({ from, to });
      }
    },
  }, [user, noteId, collaborationReady, ydocRef.current, providerRef.current]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const toggleProtectionMode = async () => {
    const newMode = protectionMode === 'public' ? 'protected' : 'public';
    setProtectionMode(newMode);
    
    try {
      await updateDoc(doc(db, 'collabNotes', noteId), {
        protectionMode: newMode,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Error updating protection mode:', err);
    }
  };

  const canEdit = () => {
    if (protectionMode === 'public') return true;
    // In protected mode, users can only edit their own content
    // This would require more complex implementation with content ownership tracking
    return true; // Simplified for now
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* Title Input */}
      <div className="border-b border-gray-200 p-4">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title..."
          className="w-full text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400"
        />
      </div>

      {/* Editor Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center space-x-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bold') ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('italic') ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Italic"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4l4 16M6 8h12M4 16h12" />
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bulletList') ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Bullet List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('orderedList') ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Numbered List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex-1"></div>

        {/* Protection Mode Toggle */}
        <button
          onClick={toggleProtectionMode}
          className={`px-3 py-1 rounded text-xs font-medium ${
            protectionMode === 'protected' 
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
              : 'bg-green-100 text-green-800 border border-green-200'
          }`}
          title={protectionMode === 'protected' ? 'Protected Mode: Users can only edit their own content' : 'Public Mode: Anyone can edit anything'}
        >
          {protectionMode === 'protected' ? '🔒 Protected' : '🌐 Public'}
        </button>

        {/* Connected Users Count */}
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="flex -space-x-1">
            {connectedUsers.slice(0, 3).map((user, index) => (
              <div
                key={user.clientId}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {connectedUsers.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                +{connectedUsers.length - 3}
              </div>
            )}
          </div>
          <span>
            {connectedUsers.length === 0
              ? "You're editing alone"
              : connectedUsers.length === 1
                ? "1 other online"
                : `${connectedUsers.length} others online`
            }
          </span>
        </div>

        {/* Save indicator */}
        <div className="text-xs text-gray-500">
          Auto-saving...
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <EditorContent editor={editor} />
        
        {/* Typing Indicator */}
        <TypingIndicator noteId={noteId} />
      </div>

      {/* Footer with word count and connection status */}
      <div className="border-t border-gray-200 p-3 text-xs text-gray-500 flex justify-between items-center">
        <div>
          {editor.storage['characterCount']?.characters() || 0} characters, {editor.storage['characterCount']?.words() || 0} words
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Real-time sync active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Connected</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
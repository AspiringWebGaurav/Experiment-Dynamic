# Collaborative Notes Setup Guide

This guide will help you set up the Collaborative Notes feature (Phase 1) for your Next.js application with Firebase.

## Prerequisites

- Firebase project with Firestore and Authentication already set up
- Node.js 20+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

The following collaborative dependencies have been added to `package.json`:
- `yjs` - CRDT library for real-time collaboration
- `y-firebase` - Firebase adapter for Y.js
- `@tiptap/react` - Rich text editor
- `@tiptap/starter-kit` - Basic TipTap extensions
- `@tiptap/extension-collaboration` - Collaboration extension
- `@tiptap/extension-collaboration-cursor` - Collaborative cursors
- `firebase-functions` - Cloud Functions SDK

### 2. Enable Firebase Realtime Database

1. Go to Firebase Console → Your Project
2. Navigate to "Realtime Database" in the left sidebar
3. Click "Create Database"
4. Choose your location (same as Firestore for consistency)
5. Start in "locked mode" (we'll deploy security rules)
6. Copy the database URL (format: `https://your-project-default-rtdb.firebaseio.com/`)

### 3. Update Environment Variables

1. Copy `.env.example` to `.env.local`
2. Add your Firebase Realtime Database URL:
   ```
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/
   ```

### 4. Deploy Security Rules

#### Firestore Rules
```bash
firebase deploy --only firestore:rules
```

#### Realtime Database Rules
```bash
firebase deploy --only database
```

### 5. Set Up Cloud Functions

1. Navigate to the functions directory:
   ```bash
   cd functions
   npm install
   ```

2. Build the functions:
   ```bash
   npm run build
   ```

3. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

### 6. Enable App Check (Recommended)

1. Go to Firebase Console → App Check
2. Register your web app
3. Choose reCAPTCHA v3 for web
4. Enable enforcement for Cloud Functions

## Features Implemented

### ✅ Core Features
- **Invite-by-code**: Each user gets a unique 4-6 character base36 invite code
- **Lobby system**: Host/join collaborative sessions via invite codes
- **Real-time editing**: Live collaborative editing with Y.js CRDTs
- **Live cursors**: See collaborators' cursors and selections in real-time
- **Presence indicators**: Visual chips showing active collaborators
- **Auto-save**: Periodic snapshots saved to Firestore (60s + onBlur)

### ✅ Technical Implementation
- **Y.js + Firebase RTDB**: Real-time operations via Realtime Database
- **TipTap Editor**: Rich text editing with collaborative extensions
- **Cloud Functions**: Secure invite code generation and session management
- **Security Rules**: Proper access control for all collaborative data
- **Free-tier optimized**: Minimal Firestore writes, efficient RTDB usage

### ✅ User Interface
- **Collaborative Lobby**: `/notes/collaborative` - Host or join sessions
- **Editor Interface**: `/notes/collaborative/[noteId]` - Real-time editing
- **Navigation Integration**: "Collaborative" button in main notes interface
- **Responsive Design**: Works on desktop and mobile devices

## Usage

### Hosting a Session
1. Go to Notes → Collaborative
2. Your invite code will be automatically generated
3. Share the code with collaborators
4. Start editing when they join

### Joining a Session
1. Go to Notes → Collaborative
2. Switch to "Join Session" tab
3. Enter the invite code (4-6 characters)
4. Click "Join Collaboration"
5. Wait for handshaking animation (3,2,1)
6. Start collaborating!

## Architecture

```
User A (Host)     User B (Joiner)
     |                 |
     v                 v
  Lobby Page ←→ Invite Code ←→ Lobby Page
     |                           |
     v                           v
Cloud Function: joinByCode ←------+
     |
     v
Collaborative Editor (Both Users)
     |
     v
Y.js Document ←→ Firebase RTDB
     |
     v
Periodic Snapshots → Firestore
```

## Data Model

### Firestore Collections
- `/profiles/{uid}` - User profiles with invite codes
- `/inviteCodes/{code}` - Invite code registry
- `/lobbies/{lobbyId}` - Active collaboration sessions
- `/collabNotes/{noteId}` - Collaborative note metadata
- `/collabNotes/{noteId}/members/{uid}` - Note access control
- `/collabNotes/{noteId}/snapshots/{versionId}` - Periodic content snapshots

### Realtime Database Paths
- `/rt-presence/{noteId}/{uid}` - User presence and cursor data
- `/yjs/{noteId}/updates/{updateId}` - Y.js CRDT operations

## Troubleshooting

### Common Issues

1. **"Cannot find module 'yjs'" errors**
   - Run `npm install` to install dependencies
   - Restart your development server

2. **Realtime Database permission denied**
   - Ensure database rules are deployed: `firebase deploy --only database`
   - Check that users are members of the collaborative note

3. **Cloud Functions not working**
   - Deploy functions: `firebase deploy --only functions`
   - Check Firebase Console → Functions for error logs

4. **Invite codes not generating**
   - Ensure Cloud Functions are deployed and callable
   - Check browser console for authentication errors

### Development Tips

- Use Firebase Emulator Suite for local development
- Monitor Realtime Database usage in Firebase Console
- Check Firestore usage to stay within free tier limits
- Use browser dev tools to debug Y.js synchronization

## Free Tier Optimization

The implementation is designed to stay within Firebase free tier limits:

- **Realtime Database**: Used for Y.js operations (cheaper than Firestore writes)
- **Firestore**: Only for metadata and periodic snapshots (60s throttling)
- **Cloud Functions**: Minimal invocations for invite code management
- **Document-level listeners**: Avoid expensive collection queries

## Next Steps (Phase 2)

Future enhancements could include:
- Public sharing links
- Note templates for collaboration
- Advanced permissions (view-only, comment-only)
- Collaboration history and version control
- Integration with existing note templates
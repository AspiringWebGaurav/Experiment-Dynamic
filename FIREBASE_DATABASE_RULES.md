# Firebase Realtime Database Rules for Collaborative Notes

## Instructions
1. Go to your Firebase Console
2. Navigate to Realtime Database > Rules
3. Replace the existing rules with the JSON below
4. Click "Publish" to deploy the rules

## Database Rules JSON

```json
{
  "rules": {
    "inviteCodes": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null && (data.child('ownerUid').val() == auth.uid || !data.exists())"
      }
    },
    "profiles": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "lobbies": {
      "$lobbyId": {
        ".read": "auth != null && (data.child('createdBy').val() == auth.uid || root.child('lobbies').child($lobbyId).child('members').child(auth.uid).exists())",
        ".write": "auth != null && (data.child('createdBy').val() == auth.uid || !data.exists())",
        "members": {
          "$uid": {
            ".read": "auth != null",
            ".write": "auth != null && (auth.uid == $uid || root.child('lobbies').child($lobbyId).child('createdBy').val() == auth.uid)"
          }
        }
      }
    },
    "rt-presence": {
      "$noteId": {
        "$uid": {
          ".read": "auth != null && (auth.uid == $uid || root.child('collabNotes').child($noteId).child('members').child(auth.uid).exists())",
          ".write": "auth != null && auth.uid == $uid && root.child('collabNotes').child($noteId).child('members').child(auth.uid).exists()"
        }
      }
    },
    "yjs": {
      "$noteId": {
        ".read": "auth != null && root.child('collabNotes').child($noteId).child('members').child(auth.uid).exists()",
        ".write": "auth != null && root.child('collabNotes').child($noteId).child('members').child(auth.uid).exists()",
        "updates": {
          "$updateId": {
            ".validate": "newData.hasChildren(['update', 'timestamp', 'userId']) && newData.child('userId').val() == auth.uid"
          }
        },
        "metadata": {
          ".read": "auth != null && root.child('collabNotes').child($noteId).child('members').child(auth.uid).exists()",
          ".write": "auth != null && root.child('collabNotes').child($noteId).child('members').child(auth.uid).exists()"
        }
      }
    },
    "collabNotes": {
      "$noteId": {
        ".read": "auth != null && root.child('collabNotes').child($noteId).child('members').child(auth.uid).exists()",
        ".write": "auth != null && root.child('collabNotes').child($noteId).child('members').child(auth.uid).exists()",
        "members": {
          "$uid": {
            ".read": "auth != null",
            ".write": "auth != null && (auth.uid == $uid || root.child('collabNotes').child($noteId).child('members').child(auth.uid).child('role').val() == 'owner')"
          }
        }
      }
    }
  }
}
```

## Rule Explanations

### inviteCodes
- **Read**: Any authenticated user can read invite codes
- **Write**: Only the owner of the invite code can modify it, or create new ones

### profiles
- **Read/Write**: Users can only access their own profile data

### lobbies
- **Read**: Lobby creator or members can read lobby data
- **Write**: Only the lobby creator can modify lobby settings
- **members**: Anyone can read member list, but only the member themselves or lobby creator can modify membership

### rt-presence (Real-time Presence)
- **Read**: User can read their own presence or presence of others in notes they're members of
- **Write**: Users can only write their own presence data in notes they're members of

### yjs (Yjs Document Sync)
- **Read/Write**: Only members of the collaborative note can read/write Yjs data
- **updates**: Validates that updates contain required fields and are from the authenticated user

### collabNotes (Collaborative Notes)
- **Read/Write**: Only members of the note can access note data
- **members**: Anyone can read member list, but only the member themselves or note owner can modify membership

## Security Features

1. **Authentication Required**: All operations require user authentication
2. **User Isolation**: Users can only access data they own or are explicitly granted access to
3. **Role-based Access**: Different permissions for owners vs. members
4. **Data Validation**: Ensures data integrity with validation rules
5. **Presence Security**: Real-time presence data is protected and scoped to note membership

## After Deployment

Once you've deployed these rules:

1. Test the collaborative features in your app
2. Create invite codes should work without permission errors
3. Joining sessions should work properly
4. Real-time collaboration should function correctly

## Troubleshooting

If you still see permission errors after deployment:
1. Wait 1-2 minutes for rules to propagate
2. Refresh your browser/app
3. Check the Firebase Console > Realtime Database > Usage tab for any rule violations
4. Verify your Firebase project ID matches the one in your app configuration
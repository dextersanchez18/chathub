# ChatHub

A free, private chat app for friends. Built with React, Firebase and Vercel.

## Deployment on Vercel

1. Link your GitHub repository to a new Vercel project.
2. In the Vercel project settings, go to Environment Variables and add the following keys from your Firebase config:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
3. The framework preset should be automatically detected as "Vite".
4. Deploy the project. The `vercel.json` included in this repository handles SPA routing rewrites.

## Firebase Configuration

### 1. Authentication
Go to your Firebase console -> Authentication -> Sign-in method, and enable "Email/Password" (you do not need email link or other providers).

### 2. Firestore Security Rules
1. Open Firestore Database in the Firebase console.
2. Go to the "Rules" tab.
3. Copy the contents of the `firestore.rules` file from the root of this repository and paste them in the console editor.
4. Click "Publish".

### 3. Firestore Indexes
To support the chat message ordering and pagination, create the following composite indexes in Firestore:

- **Collection ID**: `messages`
- **Fields to index**:
  - `createdAt` (Descending)
  - `__name__` (Descending) (Note: Firestore may auto-create this one, but you will be prompted with a link in the console/logs if it is missing when the `orderBy('createdAt', 'desc')` query runs).

Also, standard single-field indexes should be enabled for all collections.

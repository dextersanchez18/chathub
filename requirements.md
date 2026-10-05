# Project: Friends Chat (private, under 100 users, free)

## Stack
- React + Vite, mobile-first, deploy on Vercel
- Firebase Spark ONLY: Auth (email/password) + Firestore
- Do NOT use Firebase Storage, Cloud Functions, or any paid service
- All Firebase config from env vars: VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID. Never hardcode. Add .env.example.

## Auth
- Sign up/login with username + password
- Convert username to email `<username>@chatapp.local` for Firebase Auth
- Username: lowercase letters/numbers/underscore, 3-20 chars, unique
- Reserve it in `usernames/{username}` -> {uid}, in a transaction
- Show clear errors (taken, wrong password, weak password)

## Data model (Firestore)
- users/{uid}: username, displayName, photoB64 (256px JPEG), createdAt
- usernames/{username}: uid
- friendRequests/{fromUid_toUid}: from, to, status
  (pending|accepted|declined), createdAt
- chats/{chatId}: members [uidA, uidB], chatId = sorted uids joined by "_"
- chats/{chatId}/messages/{id}: senderId, text, imageB64 (optional),
  createdAt

## Screens
1. Login/Signup
2. Profile setup (display name + dp upload, crop to square, resize 256px)
3. Home: friends list + Invites tab (badge count)
4. Add Friend bar: type/paste username, send invite; block self-invite,
   duplicates, unknown usernames
5. Invites: Accept / Decline
6. Chat: real-time messages, send text, send image, auto-scroll,
   show sender dp + time

## Images (no video anywhere)
- Chat images: resize in browser to max 800px, JPEG quality 0.7,
  reject if over 300 KB after compression, store as base64 in message
- Only image/jpeg, image/png, image/webp allowed
- Do not add any video upload or video UI

## Free-tier protection
- Load only latest 50 messages per chat (query limit + "load older")
- Use onSnapshot only on the open chat and the friends/invites lists
- Unsubscribe listeners on unmount

## Security (write firestore.rules file)
- Users edit only their own users/{uid}; any signed-in user can read
  users (needed for search/friends)
- usernames: create only if not existing, only for own uid
- friendRequests: only sender can create (status pending); only
  recipient can set accepted/declined
- chats and messages: read/write only if request.auth.uid is in members;
  chat creatable only when an accepted friendRequest exists between them
- Message senderId must equal request.auth.uid; text max 2000 chars
- No client can delete other people's data
- No secrets in the repo

## Design: dark glassmorphism, must not lag on mid-range phones

Look
- Dark background (#0b0d14 area) with 2-3 soft gradient color blobs
  (purple/blue) as a STATIC fixed background layer, not animated
- Glass panels: rgba(255,255,255,0.06) background, 1px border
  rgba(255,255,255,0.12), rounded corners 16-20px, soft shadow
- Light text, accent color for buttons and sent messages
- Bottom navigation: Chats, Invites, Profile

Performance rules (strict)
- backdrop-filter blur ONLY on: top header, bottom nav, modals/popups.
  Max blur 10px. Max 3 blurred elements on screen at once.
- NEVER use backdrop-filter on message bubbles, list rows, or anything
  inside a scrolling area. Bubbles and rows use plain semi-transparent
  backgrounds plus a border to look like glass.
- Never put blur over scrolling content with large images
- Animate only transform and opacity (no animating blur, width, height,
  or box-shadow). Keep animations under 200ms.
- Add `will-change: transform` only on the few elements that animate
- Fallback: if backdrop-filter is unsupported, use a solid
  rgba(20,22,32,0.9) background
- Respect prefers-reduced-motion
- Lazy-load chat images, fixed width/height to avoid layout shift
- Memoize message components; keep list render light (50 messages max)
- No heavy UI libraries or animation libraries; plain CSS + React
- Test target: smooth 60fps scrolling in the chat on a low-end Android

## Done means
- npm run build passes, no lint errors, all CI checks green
- README with steps to add env vars in Vercel and paste firestore.rules
  into the Firebase console

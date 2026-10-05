import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, runTransaction, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export const validateUsername = (username) => {
  const regex = /^[a-z0-9_]{3,20}$/;
  return regex.test(username);
};

export const signUp = async (username, password) => {
  if (!validateUsername(username)) {
    throw new Error("Username must be 3-20 characters long and contain only lowercase letters, numbers, and underscores.");
  }

  const email = `${username}@chatapp.local`;

  try {
    // We use a transaction to reserve the username
    const usernameRef = doc(db, "usernames", username);

    // First check if username exists to give a clear error
    const usernameDoc = await getDoc(usernameRef);
    if (usernameDoc.exists()) {
      throw new Error("Username already taken.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await runTransaction(db, async (transaction) => {
      const uDoc = await transaction.get(usernameRef);
      if (uDoc.exists()) {
        throw new Error("Username already taken.");
      }
      transaction.set(usernameRef, { uid: user.uid });
    });

    return user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("Username already taken.");
    }
    if (error.code === 'auth/weak-password') {
      throw new Error("Password is too weak.");
    }
    throw error;
  }
};

export const logIn = async (username, password) => {
  const email = `${username}@chatapp.local`;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error("Invalid username or password.");
    }
    throw error;
  }
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// --- AUTHENTICATION
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- FIRESTORE - DB STUFF
import {
  getFirestore,
  /*   
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    setDoc,
    deleteDoc,
   */
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- INITALIZE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAzxjkVdltn8y2xYV9xMjQye9p2XDJ_VkQ",
  authDomain: "ninafaktura.firebaseapp.com",
  projectId: "ninafaktura",
  storageBucket: "ninafaktura.firebasestorage.app",
  messagingSenderId: "569938023030",
  appId: "1:569938023030:web:242c3d9e1c79d4e8544557",
};
const app = initializeApp(firebaseConfig);

// EXPORT FUNCTIONS AND VALUES
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

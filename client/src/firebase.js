// C:\Users\User\Downloads\HotelPlanner_Solver\HotelPlanner_Solver\client\src\firebase.js

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBukTsxc-G0qy7vilev7EJglMqK3aEL3gQ",
  authDomain: "medium-3ae06.firebaseapp.com",
  projectId: "medium-3ae06",
  storageBucket: "medium-3ae06.firebasestorage.app",
  messagingSenderId: "913524518327",
  appId: "1:913524518327:web:56175bbffb534522b1cc32",
  measurementId: "G-LXEYYW65VZ",
};

const app = initializeApp(firebaseConfig);

isSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  })
  .catch(() => {});

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
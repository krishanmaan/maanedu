import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCoyWYy22brpz1d--E9aSEs6HwS57rR5VI",
  authDomain: "maanoxedu.firebaseapp.com",
  projectId: "maanoxedu",
  storageBucket: "maanoxedu.firebasestorage.app",
  messagingSenderId: "1045089077638",
  appId: "1:1045089077638:web:55955464e1d86101aa0407",
  measurementId: "G-DR2KZ629T1",
  databaseURL: "https://maanoxedu-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;

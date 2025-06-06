import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyApsIaIH3s6R9SSNBzykiRzDKQXJCsDqbM",
    authDomain: "discretion241.firebaseapp.com",
    projectId: "discretion241",
    storageBucket: "discretion241.firebasestorage.app",
    messagingSenderId: "56853713635",
    appId: "1:56853713635:web:b3d77177affa481a69abd6",
    measurementId: "G-4VTQNRMYHZ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
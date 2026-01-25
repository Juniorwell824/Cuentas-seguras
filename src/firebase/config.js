// Importar Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

// Tu configuración de Firebase (reemplaza con tus datos)
const firebaseConfig = {
  apiKey: "AIzaSyC9qtTEdkrrUrewa04MaB9HUDOtiXET9_A",
  authDomain: "cuentas-seguras-58b25.firebaseapp.com",
  projectId: "cuentas-seguras-58b25",
  storageBucket: "cuentas-seguras-58b25.firebasestorage.app",
  messagingSenderId: "386454922056",
  appId: "1:386454922056:web:02fdf52136747c40c1097d"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


export { auth, db };


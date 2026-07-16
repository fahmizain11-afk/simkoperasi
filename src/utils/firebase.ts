import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, writeBatch, Firestore } from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

// Load config from local storage
export function getStoredFirebaseConfig(): FirebaseClientConfig | null {
  const data = localStorage.getItem('kop_firebase_config');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

// Initialize Firebase dynamically based on stored config
export function initializeDynamicFirebase(): { success: boolean; error?: string } {
  const config = getStoredFirebaseConfig();
  if (!config || !config.projectId) {
    firebaseApp = null;
    firestoreDb = null;
    return { success: false, error: "Konfigurasi Firebase belum terpasang." };
  }

  try {
    // Check if map or config items are empty/placeholders
    if (
      config.apiKey.includes('YOUR_') || 
      config.projectId.includes('ID_PROJECT') ||
      !config.apiKey ||
      !config.projectId
    ) {
      return { success: false, error: "Konfigurasi Firebase masih berupa placeholder." };
    }

    if (getApps().length > 0) {
      firebaseApp = getApp();
    } else {
      firebaseApp = initializeApp(config);
    }
    firestoreDb = getFirestore(firebaseApp);
    return { success: true };
  } catch (err: any) {
    console.error("Firebase init error:", err);
    firebaseApp = null;
    firestoreDb = null;
    return { success: false, error: err?.message || String(err) };
  }
}

// Validate connection by reading a test collection or writing a test document
export async function testFirestoreConnection(config: FirebaseClientConfig): Promise<{ success: boolean; error?: string }> {
  try {
    let app: FirebaseApp;
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(config);
    }
    const db = getFirestore(app);
    const testDocRef = doc(db, 'system_test', 'connection');
    await setDoc(testDocRef, {
      lastChecked: new Date().toISOString(),
      clientAppName: "Koperasi Dana Segar (Web Dashboard)"
    }, { merge: true });
    
    return { success: true };
  } catch (err: any) {
    console.error("Firestore test connection failed:", err);
    return { success: false, error: err?.message || "Koneksi gagal. Periksa kembali API Key, Project ID, dan hak akses Firestore RULES Anda." };
  }
}

// Save Firebase Config
export function saveFirebaseConfig(config: FirebaseClientConfig) {
  localStorage.setItem('kop_firebase_config', JSON.stringify(config));
  return initializeDynamicFirebase();
}

// Clear Firebase Config
export function clearFirebaseConfig() {
  localStorage.removeItem('kop_firebase_config');
  firebaseApp = null;
  firestoreDb = null;
}

// Sync local collection to Firebase Firestore
export async function pushCollectionToFirestore(
  collectionName: string, 
  data: any[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const initResult = initializeDynamicFirebase();
  if (!initResult.success || !firestoreDb) {
    return { success: false, count: 0, error: initResult.error || "Firebase belum diinisialisasi." };
  }

  try {
    const colRef = collection(firestoreDb, collectionName);
    let count = 0;
    
    // Firestore batch supports up to 500 writes
    const batchSize = 400;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = writeBatch(firestoreDb);
      const chunk = data.slice(i, i + batchSize);
      
      chunk.forEach(item => {
        const docId = item.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const docRef = doc(colRef, docId);
        batch.set(docRef, item, { merge: true });
        count++;
      });
      
      await batch.commit();
    }
    
    return { success: true, count };
  } catch (err: any) {
    console.error(`Gagal push collection ${collectionName}:`, err);
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

// Sync collection from Firebase Firestore
export async function fetchCollectionFromFirestore(
  collectionName: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const initResult = initializeDynamicFirebase();
  if (!initResult.success || !firestoreDb) {
    return { success: false, error: initResult.error || "Firebase belum diinisialisasi." };
  }

  try {
    const colRef = collection(firestoreDb, collectionName);
    const snapshot = await getDocs(colRef);
    const data: any[] = [];
    snapshot.forEach(doc => {
      data.push({ ...doc.data(), id: doc.id });
    });
    return { success: true, data };
  } catch (err: any) {
    console.error(`Gagal fetch collection ${collectionName}:`, err);
    return { success: false, error: err?.message || String(err) };
  }
}

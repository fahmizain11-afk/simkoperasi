import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Fetch client overridden dynamic config if exists (such as custom "danasegar" project)
function getFirebaseInitConfig() {
  const dynamicData = localStorage.getItem('kop_firebase_config');
  if (dynamicData) {
    try {
      const parsed = JSON.parse(dynamicData);
      if (parsed.apiKey && parsed.projectId) {
        return {
          apiKey: parsed.apiKey,
          authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
          projectId: parsed.projectId,
          storageBucket: parsed.storageBucket || `${parsed.projectId}.appspot.com`,
          messagingSenderId: parsed.messagingSenderId || "",
          appId: parsed.appId || "",
          firestoreDatabaseId: parsed.firestoreDatabaseId || "(default)"
        };
      }
    } catch (err) {
      // fallback to sandboxed applet config
    }
  }
  return firebaseConfig;
}

const activeConfig = getFirebaseInitConfig();
const app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);
export const db = getFirestore(app, activeConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth();

// Sign in anonymously on load to establish authentication if enabled/available
signInAnonymously(auth)
  .then(() => {
    console.log("Firebase Auth: Signed in anonymously successfully");
  })
  .catch((err) => {
    console.log("Firebase Auth: Anonymous login not active or offline. Operating with default Firestore access configurations.", err);
  });

// Validate Connection to Firestore on initial boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}
testConnection();

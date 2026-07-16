import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { compressImage } from './imageCompressor';
import { 
  Member, 
  Simpanan, 
  Pinjaman, 
  Angsuran, 
  PendapatanLain, 
  BebanKoperasi, 
  KoperasiSetup,
  ManasukaBungaLog
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Deep sanitization helper to strip undefined properties recursively for Firestore compatibility
function sanitizeForFirestore<T>(obj: T): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          res[key] = sanitizeForFirestore(val);
        }
      }
    }
    return res;
  }
  return obj;
}

// 1. Setup operations
export async function fetchKoperasiSetup(): Promise<KoperasiSetup | null> {
  const path = 'setup/info';
  try {
    const docRef = doc(db, 'setup', 'info');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as KoperasiSetup;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveKoperasiSetup(setup: KoperasiSetup): Promise<void> {
  const path = 'setup/info';
  try {
    const docRef = doc(db, 'setup', 'info');
    
    // Defensive check: if logo or kartuBgUrl are large base64 strings, compress them
    let logoUrl = setup.logoUrl;
    if (logoUrl && logoUrl.startsWith('data:image/') && logoUrl.length > 50000) {
      try {
        logoUrl = await compressImage(logoUrl, 400, 400, 0.8);
      } catch (e) {
        console.error("Defensive logo compression failed", e);
      }
    }
    
    let kartuBgUrl = setup.kartuBgUrl;
    if (kartuBgUrl && kartuBgUrl.startsWith('data:image/') && kartuBgUrl.length > 100000) {
      try {
        kartuBgUrl = await compressImage(kartuBgUrl, 800, 800, 0.75);
      } catch (e) {
        console.error("Defensive background compression failed", e);
      }
    }

    const updatedSetup = { ...setup, logoUrl, kartuBgUrl };
    const sanitized = sanitizeForFirestore(updatedSetup);
    await setDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 2. Generic collection operations
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const querySnapshot = await getDocs(colRef);
    const items: T[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ ...doc.data() } as T);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

export async function saveCollectionItem<T extends { id: string }>(
  collectionName: string, 
  item: T
): Promise<void> {
  const path = `${collectionName}/${item.id}`;
  try {
    const docRef = doc(db, collectionName, item.id);
    const sanitized = sanitizeForFirestore(item);
    await setDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCollectionItem(collectionName: string, id: string): Promise<void> {
  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearCollection(collectionName: string): Promise<void> {
  try {
    const colRef = collection(db, collectionName);
    const querySnapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    querySnapshot.forEach((document) => {
      batch.delete(doc(db, collectionName, document.id));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, collectionName);
  }
}

// Bulk seed helper
export async function seedCollection<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, collectionName, item.id);
      const sanitized = sanitizeForFirestore(item);
      batch.set(docRef, sanitized);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

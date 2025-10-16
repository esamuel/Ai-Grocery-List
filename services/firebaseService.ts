
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, User } from 'firebase/auth';
// Use Firestore Lite for non-streaming (REST-based) writes/reads to avoid WebChannel Write issues
import {
    getFirestore as getFirestoreLite,
    doc as docLite,
    getDoc as getDocLite,
    setDoc as setDocLite,
    updateDoc as updateDocLite,
    collection as collectionLite,
    query as queryLite,
    where as whereLite,
    getDocs as getDocsLite,
} from 'firebase/firestore/lite';
import type { GroceryListData, GroceryHistoryItem } from '../types';

// --- IMPORTANT ---
// Firebase configuration is loaded from Vite environment variables.
// Define these in your local .env.local and in Netlify site environment settings.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

let app: FirebaseApp | null = null;
let dbLite: ReturnType<typeof getFirestoreLite> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let currentUser: User | null = null;

// Lazily initialize Firebase on first use to prevent app from crashing on load
// if the config is missing.
const getFirebaseServices = () => {
    console.log('getFirebaseServices: Called');
    if (app && dbLite && auth) {
        console.log('getFirebaseServices: Using existing services');
        return { app, dbLite, auth };
    }

    console.log('getFirebaseServices: Initializing Firebase...');
    // Validate config presence and provide clear errors
    const missing = Object.entries(firebaseConfig)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
        throw new Error(`Firebase is not configured. Missing env vars for: ${missing.join(', ')}. Set VITE_FIREBASE_* variables in your environment.`);
    }

    try {
        console.log('getFirebaseServices: Initializing app...');
        app = initializeApp(firebaseConfig);
        console.log('getFirebaseServices: App initialized');
        
        // Initialize Firebase Auth
        console.log('getFirebaseServices: Initializing Auth...');
        auth = getAuth(app);
        
        // Initialize Firestore Lite instance (REST-based)
        console.log('getFirebaseServices: Initializing Firestore Lite...');
        dbLite = getFirestoreLite(app);
        console.log('getFirebaseServices: All services initialized successfully');
        
        return { app, dbLite, auth };
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        throw new Error("Failed to initialize Firebase. Please check your configuration in services/firebaseService.ts.");
    }
};


const listsCollection = 'groceryLists';
const usersCollection = 'users';

// Authentication functions
export const signInUser = async (email: string, password: string): Promise<User> => {
    const { auth, dbLite } = getFirebaseServices();
    if (!auth) throw new Error('Auth service not initialized');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    
    // Ensure user document exists with displayName field (for legacy users)
    try {
        const userDocRef = docLite(dbLite, usersCollection, userCredential.user.uid);
        const userDoc = await getDocLite(userDocRef);
        
        if (!userDoc.exists()) {
            // Create user document if it doesn't exist
            await setDocLite(userDocRef, {
                email: userCredential.user.email,
                favorites: [],
                displayName: '',
                createdAt: new Date().toISOString(),
                lastActive: new Date().toISOString()
            });
        } else {
            // Update lastActive and ensure displayName field exists
            const userData = userDoc.data();
            await setDocLite(userDocRef, {
                ...userData,
                displayName: userData.displayName !== undefined ? userData.displayName : '',
                lastActive: new Date().toISOString()
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error updating user document on sign-in:', error);
    }
    
    return userCredential.user;
};

export const signUpUser = async (email: string, password: string): Promise<User> => {
    const { auth, dbLite } = getFirebaseServices();
    if (!auth) throw new Error('Auth service not initialized');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    
    // Create user document with empty favorites and empty displayName
    await setDocLite(docLite(dbLite, usersCollection, userCredential.user.uid), {
        email: userCredential.user.email,
        favorites: [],
        displayName: '', // Initialize empty displayName field
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
    });
    
    return userCredential.user;
};

export const signOutUser = async (): Promise<void> => {
    const { auth } = getFirebaseServices();
    if (!auth) throw new Error('Auth service not initialized');
    await signOut(auth);
    currentUser = null;
};

export const resetPassword = async (email: string): Promise<void> => {
    const { auth } = getFirebaseServices();
    if (!auth) throw new Error('Auth service not initialized');
    await sendPasswordResetEmail(auth, email);
};

export const getCurrentUser = (): User | null => {
    return currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
    const { auth } = getFirebaseServices();
    if (!auth) throw new Error('Auth service not initialized');
    return onAuthStateChanged(auth, (user) => {
        currentUser = user;
        callback(user);
    });
};

export const createNewList = async (): Promise<string> => {
    console.log('createNewList: Starting...');
    try {
        const { dbLite } = getFirebaseServices();
        console.log('createNewList: Firebase services initialized');
        
        const listId = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log('createNewList: Generated listId:', listId);
        
        const newListData: GroceryListData = {
            items: [],
            history: [],
        };
        
        console.log('createNewList: About to write to Firestore Lite...');
        // Use Firestore Lite for write to avoid WebChannel Write stream
        await setDocLite(docLite(dbLite, listsCollection, listId), newListData as any);
        console.log('createNewList: Successfully wrote to Firestore');
        
        return listId;
    } catch (error) {
        console.error('createNewList: Error occurred:', error);
        throw error;
    }
};

export const doesListExist = async (listId: string): Promise<boolean> => {
    const { dbLite } = getFirebaseServices();
    // Use Firestore Lite for existence check
    const docRefLite = docLite(dbLite, listsCollection, listId);
    const docSnap = await getDocLite(docRefLite);
    return docSnap.exists();
};

// Optimized polling with faster updates and smart backoff
export const subscribeToList = (listId: string, callback: (data: GroceryListData) => void): (() => void) => {
    const { dbLite } = getFirebaseServices();
    let cancelled = false;
    const ACTIVE_INTERVAL = 3000; // 3s when tab is active (fast updates)
    const HIDDEN_INTERVAL = 30000; // 30s when tab is hidden (save battery/quota)
    const MAX_INTERVAL = 60000; // cap at 1 minute (only on errors)
    let currentInterval = ACTIVE_INTERVAL;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = (immediate = false) => {
        if (cancelled) return;
        if (timer) clearTimeout(timer);
        const delay = immediate ? 0 : currentInterval + Math.random() * 500; // small jitter
        timer = setTimeout(poll, delay);
    };

    const poll = async () => {
        if (cancelled) return;
        
        // If tab is hidden, slow down to save quota
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            currentInterval = HIDDEN_INTERVAL;
            scheduleNext();
            return;
        }
        
        try {
            const docRefLite = docLite(dbLite, listsCollection, listId);
            const snap = await getDocLite(docRefLite);
            if (snap.exists()) {
                callback(snap.data() as GroceryListData);
            } else {
                console.error(`List with ID "${listId}" does not exist!`);
            }
            // Success: reset to fast interval
            currentInterval = ACTIVE_INTERVAL;
        } catch (e: any) {
            const msg = e?.message || String(e);
            const code = e?.code || '';
            // Only slow down on quota/rate limit errors
            if (code === 'resource-exhausted' || /quota exceeded|429/i.test(msg)) {
                currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
                console.warn(`⚠️ Firestore quota limit: slowing to ${currentInterval}ms`);
            } else {
                // Other errors: moderate backoff
                currentInterval = Math.min(ACTIVE_INTERVAL * 3, MAX_INTERVAL);
                console.warn('Polling read failed:', e);
            }
        } finally {
            scheduleNext();
        }
    };

    // Start immediate fetch
    poll();
    
    // Return cleanup function with manual trigger capability
    const cleanup = () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
    };
    
    // Expose trigger for immediate poll (for optimistic updates)
    (cleanup as any).triggerPoll = () => {
        if (!cancelled) scheduleNext(true);
    };
    
    return cleanup;
};

// Remove undefined values from an object (Firestore doesn't accept undefined)
function removeUndefinedValues(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(removeUndefinedValues);
    }
    if (obj !== null && typeof obj === 'object') {
        const cleaned: any = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                cleaned[key] = removeUndefinedValues(obj[key]);
            }
        }
        return cleaned;
    }
    return obj;
}

export const updateList = async (listId: string, data: GroceryListData): Promise<void> => {
    const { dbLite } = getFirebaseServices();
    // Clean undefined values before sending to Firestore
    const cleanData = removeUndefinedValues(data);
    // Use Firestore Lite for write to avoid WebChannel Write stream
    await setDocLite(docLite(dbLite, listsCollection, listId), cleanData);
};

// Update ONLY the items field (don't overwrite history)
export const updateListItems = async (listId: string, items: GroceryItem[]): Promise<void> => {
    const { dbLite } = getFirebaseServices();
    // Clean undefined values before sending to Firestore
    const cleanItems = removeUndefinedValues(items);
    // Use updateDoc to only update the items field
    const docRef = docLite(dbLite, listsCollection, listId);
    await updateDocLite(docRef, { 
        items: cleanItems,
        updatedAt: new Date().toISOString()
    });
    console.log('✅ Items list updated in Firestore (fast poll triggered)');
};

// User favorites functions (separate from individual lists)
export const getUserFavorites = async (): Promise<GroceryHistoryItem[]> => {
    if (!currentUser) return [];
    
    const { dbLite } = getFirebaseServices();
    const userDocRef = docLite(dbLite, usersCollection, currentUser.uid);
    const userDoc = await getDocLite(userDocRef);
    
    if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.favorites || [];
    }
    
    return [];
};

export const updateUserFavorites = async (favorites: GroceryHistoryItem[]): Promise<void> => {
    if (!currentUser) return;
    
    const { dbLite } = getFirebaseServices();
    const userDocRef = docLite(dbLite, usersCollection, currentUser.uid);
    
    // Get current user data
    const userDoc = await getDocLite(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Update favorites
    await setDocLite(userDocRef, {
        ...userData,
        favorites: favorites,
        updatedAt: new Date().toISOString()
    });
};

export const addToUserFavorites = async (items: GroceryHistoryItem[]): Promise<void> => {
    if (!currentUser) return;
    
    const currentFavorites = await getUserFavorites();
    const updatedFavorites = [...currentFavorites];
    
    items.forEach(item => {
        const existingIndex = updatedFavorites.findIndex(
            fav => fav.name.toLowerCase() === item.name.toLowerCase()
        );
        
        if (existingIndex > -1) {
            // Update existing favorite
            updatedFavorites[existingIndex].frequency += item.frequency;
            updatedFavorites[existingIndex].lastAdded = item.lastAdded;
        } else {
            // Add new favorite
            updatedFavorites.push(item);
        }
    });
    
    await updateUserFavorites(updatedFavorites);
};

// User-based list management functions
export const getUserMainList = async (): Promise<string> => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const { dbLite } = getFirebaseServices();
    const userDocRef = docLite(dbLite, usersCollection, currentUser.uid);
    const userDoc = await getDocLite(userDocRef);
    
    if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.mainListId) {
            return userData.mainListId;
        }
    }
    
    // Create a new main list for the user
    const listId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newListData: GroceryListData = {
        items: [],
        history: [],
    };
    
    // Create the list
    await setDocLite(docLite(dbLite, listsCollection, listId), {
        ...newListData,
        ownerId: currentUser.uid,
        members: [currentUser.uid],
        createdAt: new Date().toISOString()
    } as any);
    
    // Update user document with main list ID
    const currentUserData = userDoc.exists() ? userDoc.data() : {};
    await setDocLite(userDocRef, {
        ...currentUserData,
        email: currentUser.email,
        mainListId: listId,
        createdAt: currentUserData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    
    return listId;
};

export const addFamilyMember = async (memberEmail: string): Promise<boolean> => {
    if (!currentUser) {
        console.error('No current user when trying to add family member');
        return false;
    }
    
    try {
        const { dbLite } = getFirebaseServices();
        const emailToSearch = memberEmail.toLowerCase().trim();
        
        console.log('Adding family member:', emailToSearch);
        console.log('Current user:', currentUser.email);
        
        // Get the main user's list ID
        const mainListId = await getUserMainList();
        console.log('Main list ID:', mainListId);
        
        // Find the family member by email - try multiple approaches
        console.log('Searching for user with email:', emailToSearch);
        
        // First, try direct query
        const usersQuery = queryLite(
            collectionLite(dbLite, usersCollection),
            whereLite('email', '==', emailToSearch)
        );
        const querySnapshot = await getDocsLite(usersQuery);
        
        console.log('Query result - docs found:', querySnapshot.docs.length);
        
        if (querySnapshot.empty) {
            // Try case-insensitive search by getting all users and filtering
            console.log('Direct query failed, trying to get all users...');
            const allUsersQuery = queryLite(collectionLite(dbLite, usersCollection));
            const allUsersSnapshot = await getDocsLite(allUsersQuery);
            
            console.log('Total users in database:', allUsersSnapshot.docs.length);
            
            // Log all users for debugging
            allUsersSnapshot.docs.forEach(doc => {
                const userData = doc.data();
                console.log('User found:', userData.email, 'ID:', doc.id);
            });
            
            // Find user manually
            const memberDoc = allUsersSnapshot.docs.find(doc => {
                const userData = doc.data();
                return userData.email && userData.email.toLowerCase().trim() === emailToSearch;
            });
            
            if (!memberDoc) {
                console.error('User not found after manual search');
                return false;
            }
            
            const memberId = memberDoc.id;
            const memberData = memberDoc.data();
            
            console.log('Found member manually:', memberData.email, 'ID:', memberId);
            
            // Update the list and member as before
            const listDocRef = docLite(dbLite, listsCollection, mainListId);
            const listDoc = await getDocLite(listDocRef);
            
            if (listDoc.exists()) {
                const listData = listDoc.data();
                const currentMembers = listData.members || [currentUser.uid];
                
                if (!currentMembers.includes(memberId)) {
                    await setDocLite(listDocRef, {
                        ...listData,
                        members: [...currentMembers, memberId],
                        updatedAt: new Date().toISOString()
                    });
                    console.log('Updated list with new member');
                }
            }
            
            // Update the family member's document
            await setDocLite(docLite(dbLite, usersCollection, memberId), {
                ...memberData,
                sharedListId: mainListId,
                updatedAt: new Date().toISOString()
            });
            console.log('Updated member document with shared list ID');
            
            return true;
        }
        
        // Original path if direct query worked
        const memberDoc = querySnapshot.docs[0];
        const memberId = memberDoc.id;
        const memberData = memberDoc.data();
        
        console.log('Found member via direct query:', memberData.email, 'ID:', memberId);
        
        // Update the list to include the new member
        const listDocRef = docLite(dbLite, listsCollection, mainListId);
        const listDoc = await getDocLite(listDocRef);
        
        if (listDoc.exists()) {
            const listData = listDoc.data();
            const currentMembers = listData.members || [currentUser.uid];
            
            if (!currentMembers.includes(memberId)) {
                await setDocLite(listDocRef, {
                    ...listData,
                    members: [...currentMembers, memberId],
                    updatedAt: new Date().toISOString()
                });
                console.log('Updated list with new member');
            }
        }
        
        // Update the family member's document to reference this shared list
        await setDocLite(docLite(dbLite, usersCollection, memberId), {
            ...memberData,
            sharedListId: mainListId,
            updatedAt: new Date().toISOString()
        });
        console.log('Updated member document with shared list ID');
        
        return true;
    } catch (error) {
        console.error('Error adding family member:', error);
        return false;
    }
};

export const getAccessibleListId = async (): Promise<string> => {
    if (!currentUser) throw new Error('User not authenticated');

    const { dbLite } = getFirebaseServices();

    // 1) Try cached listId first to avoid extra reads (verify existence in background)
    const cacheKey = `listId:${currentUser.uid}`;
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cached) {
        // Verify existence in background and self-heal cache if needed
        doesListExist(cached).then(exists => {
            if (!exists) {
                // Clear bad cache so next call refetches
                if (typeof localStorage !== 'undefined') localStorage.removeItem(cacheKey);
            }
        }).catch(() => {/* ignore */});
        return cached;
    }

    // 2) Fetch user doc with small retry/backoff to mitigate 429s
    const userDocRef = docLite(dbLite, usersCollection, currentUser.uid);
    let userDoc: any = null;
    let delay = 1000; // ms - start with longer delay
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            userDoc = await getDocLite(userDocRef);
            break;
        } catch (e: any) {
            const msg = e?.message || '';
            const code = e?.code || '';
            if (code === 'resource-exhausted' || /quota exceeded|429/i.test(msg)) {
                if (attempt === 2) {
                    // Final attempt failed - throw quota error with clear message
                    throw new Error('Firestore quota exceeded. Please wait a few minutes and try again.');
                }
                await new Promise(res => setTimeout(res, delay + Math.random() * 500));
                delay = Math.min(delay * 3, 10000); // more aggressive backoff
                continue;
            }
            throw e;
        }
    }
    
    if (!userDoc) {
        throw new Error('Failed to fetch user data after retries. Please try again later.');
    }

    console.log('Getting accessible list for user:', currentUser.email);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User data:', userData);

        // If user has a shared list (is a family member), return that FIRST
        if (userData.sharedListId) {
            console.log('User is family member, using shared list:', userData.sharedListId);
            if (typeof localStorage !== 'undefined') localStorage.setItem(cacheKey, userData.sharedListId);
            return userData.sharedListId;
        }

        // If user has a main list (is the owner), return that
        if (userData.mainListId) {
            console.log('User is owner, using main list:', userData.mainListId);
            if (typeof localStorage !== 'undefined') localStorage.setItem(cacheKey, userData.mainListId);
            return userData.mainListId;
        }
    }

    // If no list exists, create a new main list
    console.log('No existing list, creating new main list');
    const newId = await getUserMainList();
    if (typeof localStorage !== 'undefined') localStorage.setItem(cacheKey, newId);
    return newId;
};

export const forceRefreshUserList = async (): Promise<string> => {
    if (!currentUser) throw new Error('User not authenticated');
    
    console.log('Force refreshing user list for:', currentUser.email);
    
    // Clear any cached data and get fresh list ID
    const listId = await getAccessibleListId();
    console.log('Refreshed list ID:', listId);
    
    return listId;
};

export const isListOwner = async (): Promise<boolean> => {
    if (!currentUser) return false;

    try {
        const { dbLite } = getFirebaseServices();
        const userDocRef = docLite(dbLite, usersCollection, currentUser.uid);
        const userDoc = await getDocLite(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            // User is owner if they have a mainListId (not just sharedListId)
            return !!userData.mainListId && !userData.sharedListId;
        }

        return false;
    } catch (error) {
        console.error('Error checking if user is list owner:', error);
        return false;
    }
};

export const getUserDisplayName = async (): Promise<string> => {
    if (!currentUser) return '';

    try {
        const { dbLite } = getFirebaseServices();
        const userDocRef = docLite(dbLite, usersCollection, currentUser.uid);
        const userDoc = await getDocLite(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.displayName || '';
        }

        return '';
    } catch (error) {
        console.error('Error getting user display name:', error);
        return '';
    }
};

export const updateUserDisplayName = async (displayName: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
        const { dbLite } = getFirebaseServices();
        const userDocRef = docLite(dbLite, usersCollection, currentUser.uid);
        const userDoc = await getDocLite(userDocRef);

        if (userDoc.exists()) {
            await setDocLite(
                userDocRef,
                {
                    ...userDoc.data(),
                    displayName: displayName.trim(),
                    updatedAt: new Date().toISOString(),
                },
                { merge: true }
            );
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error updating user display name:', error);
        return false;
    }
};

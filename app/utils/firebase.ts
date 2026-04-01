import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

export const useFirebase = () => {
  const config = useRuntimeConfig().public.firebase

  const firebaseConfig = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId
  }

  let app: FirebaseApp
  const apps = getApps()

  if (!apps.length) {
    app = initializeApp(firebaseConfig)
  } else {
    app = apps[0] as FirebaseApp
  }


  const auth: Auth = getAuth(app)
  const db: Firestore = getFirestore(app)

  return {
    app,
    auth,
    db
  }
}

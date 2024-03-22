import type { FirebaseAuthTypes } from '@react-native-firebase/auth'
import auth from '@react-native-firebase/auth'
import { useEffect, useState } from 'react'

/**
 * Recoilが使えない環境の時にもユーザーを持ちたい場合に使います。基本的に `useCachedAnonymousUser` を使ってください。
 */
const useAnonymousUser = (): FirebaseAuthTypes.User | undefined => {
  const [user, setUser] = useState<FirebaseAuthTypes.User>()
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser(authUser)
      } else {
        auth()
          .signInAnonymously()
          .then((credential) => setUser(credential.user))
      }
    })
    return unsubscribe
  }, [setUser, user])

  return user
}

export default useAnonymousUser

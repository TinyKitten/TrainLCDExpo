import { LocationObject } from 'expo-location'
import { atom } from 'recoil'
import { RECOIL_STATES } from '../../constants'

export interface LocationState {
  location: LocationObject | null
  badAccuracy: boolean
}

const locationState = atom<LocationState>({
  key: RECOIL_STATES.location,
  default: {
    location: null,
    badAccuracy: false,
  },
})

export default locationState

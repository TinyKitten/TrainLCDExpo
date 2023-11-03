import { atom } from 'recoil'
import { RECOIL_STATES } from '../../constants'
import { StationAPIClient } from '../../gen/StationapiServiceClientPb'

export type TTSCacheBody = {
  text: string
  path: string
}

export type CacheState = {
  ttsCache: Map<string, TTSCacheBody>
  grpcClient: StationAPIClient | null
}

const cacheState = atom<CacheState>({
  key: RECOIL_STATES.cacheState,
  default: {
    ttsCache: new Map<string, TTSCacheBody>(),
    grpcClient: null,
  },
})

export default cacheState

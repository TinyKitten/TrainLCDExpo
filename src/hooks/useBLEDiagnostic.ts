import { encode as btoa } from 'base-64'
import * as Application from 'expo-application'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BleManager, Device } from 'react-native-ble-plx'
import {
  BLE_ENABLED,
  BLE_TARGET_CHARACTERISTIC_UUID,
  BLE_TARGET_LOCAL_NAME,
  BLE_TARGET_SERVICE_UUID,
} from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import stationState from '../store/atoms/station'
import useIsPassing from './useIsPassing'
import { useStore } from './useStore'

const manager = new BleManager()

export const useBLEDiagnostic = () => {
  const [device, setDevice] = useState<Device | null>(null)
  const latitude = useStore((state) => state.location?.coords.latitude)
  const longitude = useStore((state) => state.location?.coords.longitude)
  const accuracy = useStore((state) => state.location?.coords.accuracy)
  const speed = useStore((state) => state.location?.coords.speed)
  const { arrived, approaching } = useRecoilValue(stationState)

  const isPassing = useIsPassing()

  const stateText = useMemo(() => {
    const states = []

    if (isPassing) {
      states.push('PASSING')
    }
    if (approaching) {
      states.push('APPROACHING')
    }
    if (arrived) {
      states.push('ARRIVED')
    }

    if (!states.length) {
      return 'NONE'
    }

    return states.join(', ')
  }, [approaching, arrived, isPassing])

  const payloadStr = useMemo(() => {
    return btoa(
      unescape(
        encodeURIComponent(
          `
TrainLCD MO(${Application.nativeBuildVersion})\n
Lat:${latitude ?? '?'}
Lon:${longitude ?? '?'}
Acc:${(accuracy ?? 0) > 0 ? `${accuracy}m` : '?'}
Spd:${(speed ?? 0) > 0 ? `${speed}km/h` : '?'}
Sts:${stateText}
          `.trim()
        )
      )
    )
  }, [accuracy, latitude, longitude, speed, stateText])

  const scanAndConnect = useCallback(() => {
    manager.startDeviceScan(null, null, async (err, dev) => {
      if (err) {
        console.error(err)
        return
      }

      try {
        if (dev?.localName === BLE_TARGET_LOCAL_NAME) {
          setDevice(
            await (await dev.connect()).discoverAllServicesAndCharacteristics()
          )
          manager.stopDeviceScan()
          console.warn('BLE device connected')
        }
      } catch (err) {
        console.error(err)
      }
    })
  }, [])

  useEffect(() => {
    if (
      !BLE_ENABLED ||
      !BLE_TARGET_SERVICE_UUID ||
      !BLE_TARGET_CHARACTERISTIC_UUID
    ) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      if (device && payloadStr.length) {
        await device.writeCharacteristicWithResponseForService(
          BLE_TARGET_SERVICE_UUID,
          BLE_TARGET_CHARACTERISTIC_UUID,
          payloadStr
        )
      }
    })()
  }, [device, payloadStr])

  useEffect(() => {
    if (BLE_ENABLED) {
      scanAndConnect()
    }
  }, [scanAndConnect])
}

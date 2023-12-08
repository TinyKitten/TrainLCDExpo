import { useActionSheet } from '@expo/react-native-action-sheet'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LocationObject } from 'expo-location'
import { addScreenshotListener } from 'expo-screen-capture'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Dimensions, Platform, StyleSheet, View } from 'react-native'
import RNFS from 'react-native-fs'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Share from 'react-native-share'
import ViewShot from 'react-native-view-shot'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import {
  ALL_AVAILABLE_LANGUAGES,
  ASYNC_STORAGE_KEYS,
  POWER_SAVING_PRESETS,
  PowerSavingPreset,
  parenthesisRegexp,
} from '../constants'
import useAndroidWearable from '../hooks/useAndroidWearable'
import useAppleWatch from '../hooks/useAppleWatch'
import useCachedInitAnonymousUser from '../hooks/useCachedAnonymousUser'
import useCheckStoreVersion from '../hooks/useCheckStoreVersion'
import useConnectivity from '../hooks/useConnectivity'
import { useCurrentLine } from '../hooks/useCurrentLine'
import useListenMessaging from '../hooks/useListenMessaging'
import useReport from '../hooks/useReport'
import useReportEligibility from '../hooks/useReportEligibility'
import useResetMainState from '../hooks/useResetMainState'
import { useTTS } from '../hooks/useTTS'
import useUpdateLiveActivities from '../hooks/useUpdateLiveActivities'
import { APP_THEME, AppTheme } from '../models/Theme'
import locationState from '../store/atoms/location'
import mirroringShareState from '../store/atoms/mirroringShare'
import navigationState from '../store/atoms/navigation'
import powerSavingState from '../store/atoms/powerSaving'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import { isJapanese, translate } from '../translation'
import { isDevApp } from '../utils/isDevApp'
import DevOverlay from './DevOverlay'
import Header from './Header'
import MirroringShareModal from './MirroringShareModal'
import NewReportModal from './NewReportModal'
import WarningPanel from './WarningPanel'

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    minHeight: Dimensions.get('window').height,
    height: '100%',
  },
})

type Props = {
  children: React.ReactNode
}

const WARNING_PANEL_LEVEL = {
  URGENT: 'URGENT',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const

export type WarningPanelLevel =
  (typeof WARNING_PANEL_LEVEL)[keyof typeof WARNING_PANEL_LEVEL]

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [warningInfo, setWarningInfo] = useState<{
    level: WarningPanelLevel
    text: string
  } | null>(null)
  const [msFeatureModalShow, setMsFeatureModalShow] = useState(false)
  const [tripleTapNoticeDismissed, setTripleTapNoticeDismissed] = useState(true)

  const { selectedBound } = useRecoilValue(stationState)
  const { location, badAccuracy } = useRecoilValue(locationState)
  const setTheme = useSetRecoilState(themeState)
  const [{ autoModeEnabled, requiredPermissionGranted }, setNavigation] =
    useRecoilState(navigationState)
  const setSpeech = useSetRecoilState(speechState)
  const setPowerSavingState = useSetRecoilState(powerSavingState)
  const [reportModalShow, setReportModalShow] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [reportDescription, setReportDescription] = useState('')
  const [screenShotBase64, setScreenShotBase64] = useState('')
  const [screenshotTaken, setScreenshotTaken] = useState(false)
  const { subscribing } = useRecoilValue(mirroringShareState)

  useCheckStoreVersion()
  useAppleWatch()
  useAndroidWearable()
  useUpdateLiveActivities()
  useListenMessaging()
  // メイン画面のレンダリングとは分離して実行したいのでMain Componentから離している
  useTTS()

  const user = useCachedInitAnonymousUser()
  const currentLine = useCurrentLine()
  const resetStateAndUnsubscribeMS = useResetMainState()
  const navigation = useNavigation()
  const isInternetAvailable = useConnectivity()
  const { showActionSheetWithOptions } = useActionSheet()
  const { sendReport, descriptionLowerLimit } = useReport(user)
  const reportEligibility = useReportEligibility()

  const viewShotRef = useRef<ViewShot>(null)

  const onTriplePress = async (): Promise<void> => {
    if (!selectedBound) {
      return
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const buttons = Platform.select({
      ios: [
        translate('back'),
        translate('share'),
        isDevApp ? translate('msFeatureTitle') : translate('report'),
        translate('cancel'),
      ],
      android: [
        translate('share'),
        isDevApp ? translate('msFeatureTitle') : translate('report'),
        translate('cancel'),
      ],
    })

    showActionSheetWithOptions(
      {
        options: buttons || [],
        destructiveButtonIndex: Platform.OS === 'ios' ? 0 : undefined,
        cancelButtonIndex: buttons && buttons.length - 1,
      },
      (buttonIndex) => {
        switch (buttonIndex) {
          // iOS: back, Android: share
          case 0:
            if (Platform.OS === 'ios') {
              resetStateAndUnsubscribeMS()
              navigation.navigate('SelectBound')
              break
            }
            handleShare()
            break
          // iOS: share, Android: mirroring share or feedback
          case 1:
            if (Platform.OS === 'ios') {
              handleShare()
              break
            }
            if (isDevApp) {
              handleMirroringShare()
              break
            }
            handleReport()
            break
          // iOS: mirroring share or feedback, Android: cancel
          case 2: {
            if (Platform.OS === 'ios') {
              if (isDevApp) {
                handleMirroringShare()
                break
              }
              handleReport()
              break
            }
            break
          }
          // iOS: cancel, Android: will be not passed here
          case 3: {
            break
          }
          // iOS, Android: will be not passed here
          default:
            break
        }
      }
    )
  }

  const tap = Gesture.Tap().numberOfTaps(3).onStart(onTriplePress)

  useEffect(() => {
    const loadSettingsAsync = async () => {
      const prevThemeStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.PREVIOUS_THEME
      )

      if (prevThemeStr) {
        const legacyThemeId = parseInt(prevThemeStr, 10)
        const hasLegacyThemeId = !Number.isNaN(legacyThemeId)
        const currentTheme = hasLegacyThemeId
          ? Object.values(APP_THEME)[legacyThemeId]
          : (prevThemeStr as AppTheme)
        setTheme((prev) => ({
          ...prev,
          theme: currentTheme || APP_THEME.TOKYO_METRO,
        }))
        if (hasLegacyThemeId) {
          await AsyncStorage.setItem(
            ASYNC_STORAGE_KEYS.PREVIOUS_THEME,
            currentTheme
          )
        }
      }
      const enabledLanguagesStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.ENABLED_LANGUAGES
      )
      if (enabledLanguagesStr) {
        setNavigation((prev) => ({
          ...prev,
          enabledLanguages:
            JSON.parse(enabledLanguagesStr) || ALL_AVAILABLE_LANGUAGES,
        }))
      }
      const speechEnabledStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.SPEECH_ENABLED
      )
      setSpeech((prev) => ({
        ...prev,
        enabled: speechEnabledStr === 'true',
      }))
      const losslessEnabledStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.QA_LOSSLESS_ENABLED // プレミアム音声はまだリリースしないのでQA_のままで問題ない
      )
      setSpeech((prev) => ({
        ...prev,
        losslessEnabled: losslessEnabledStr === 'true',
      }))
      const bgTTSEnabledStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.QA_BG_TTS_ENABLED // プレミアム音声はまだリリースしないのでQA_のままで問題ない
      )
      setSpeech((prev) => ({
        ...prev,
        backgroundEnabled: bgTTSEnabledStr === 'true',
      }))

      const preferredPowerSavingPresetName = (await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.PREFERRED_POWER_SAVING_PRESET
      )) as PowerSavingPreset | null
      setPowerSavingState((prev) => ({
        ...prev,
        preset:
          POWER_SAVING_PRESETS[
            preferredPowerSavingPresetName ?? POWER_SAVING_PRESETS.BALANCED
          ],
      }))

      setTripleTapNoticeDismissed(
        (await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.TRIPLE_TAP_NOTICE_DISMISSED
        )) === 'true'
      )
    }

    loadSettingsAsync()
  }, [setNavigation, setPowerSavingState, setSpeech, setTheme])

  useEffect(() => {
    if (autoModeEnabled) {
      setWarningDismissed(false)
    }
  }, [autoModeEnabled])

  useEffect(() => {
    if (subscribing) {
      setWarningDismissed(false)
    }
  }, [subscribing])

  useEffect(() => {
    if (!isInternetAvailable) {
      setWarningDismissed(false)
    }
  }, [isInternetAvailable])

  useEffect(() => {
    const { remove } = addScreenshotListener(() => {
      if (selectedBound) {
        setWarningDismissed(false)
        setScreenshotTaken(true)
      }
    })

    return remove
  }, [selectedBound])

  const getWarningInfo = useCallback(() => {
    if (warningDismissed) {
      return null
    }

    if (!tripleTapNoticeDismissed && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('tripleTapNotice'),
      }
    }

    if (subscribing) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('subscribedNotice'),
      }
    }

    if (autoModeEnabled) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('autoModeInProgress'),
      }
    }

    if (!isInternetAvailable && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.WARNING,
        text: translate('offlineWarningText'),
      }
    }

    if (!requiredPermissionGranted && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.WARNING,
        text: translate('permissionsNotGranted'),
      }
    }

    if (badAccuracy) {
      return {
        level: WARNING_PANEL_LEVEL.URGENT,
        text: translate('badAccuracy'),
      }
    }

    if (screenshotTaken) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('shareNotice'),
      }
    }
    return null
  }, [
    autoModeEnabled,
    badAccuracy,
    isInternetAvailable,
    requiredPermissionGranted,
    screenshotTaken,
    selectedBound,
    subscribing,
    tripleTapNoticeDismissed,
    warningDismissed,
  ])

  useEffect(() => {
    const info = getWarningInfo()
    setWarningInfo(info)
  }, [getWarningInfo])

  const onWarningPress = useCallback((): void => {
    setWarningDismissed(true)
    setScreenshotTaken(false)

    if (!tripleTapNoticeDismissed) {
      const saveFlagAsync = async () => {
        await AsyncStorage.setItem(
          ASYNC_STORAGE_KEYS.TRIPLE_TAP_NOTICE_DISMISSED,
          'true'
        )
      }
      saveFlagAsync()
    }
  }, [tripleTapNoticeDismissed])

  const NullableWarningPanel: React.FC = useCallback(
    () =>
      warningInfo ? (
        <WarningPanel
          onPress={onWarningPress}
          text={warningInfo.text}
          warningLevel={warningInfo.level}
        />
      ) : null,
    [onWarningPress, warningInfo]
  )

  const handleShare = useCallback(async () => {
    if (!viewShotRef || !currentLine) {
      return
    }
    try {
      if (!viewShotRef.current?.capture || !currentLine) {
        return
      }

      const uri = await viewShotRef.current.capture()
      const res = await RNFS.readFile(uri, 'base64')
      const urlString = `data:image/jpeg;base64,${res}`
      const message = isJapanese
        ? `${currentLine.nameShort.replace(
            parenthesisRegexp,
            ''
          )}で移動中です！ #TrainLCD https://trainlcd.app`
        : `I'm riding ${currentLine.nameRoman?.replace(
            parenthesisRegexp,
            ''
          )} with #TrainLCD https://trainlcd.app`
      const options = {
        title: 'TrainLCD',
        message,
        url: urlString,
        type: 'image/png',
      }
      await Share.open(options)
    } catch (err) {
      if ((err as { message: string }).message !== 'User did not share') {
        Alert.alert(translate('couldntShare'))
      }
    }
  }, [currentLine])

  const handleMirroringShare = () => {
    if (subscribing) {
      Alert.alert(translate('errorTitle'), translate('publishProhibited'))
    } else {
      setMsFeatureModalShow(true)
    }
  }
  const handleMirroringShareModalClose = () => setMsFeatureModalShow(false)

  const handleReport = async () => {
    if (!viewShotRef.current?.capture) {
      return
    }

    try {
      switch (reportEligibility) {
        case 'banned':
          Alert.alert(translate('errorTitle'), translate('feedbackBanned'))
          return
        case 'limitExceeded':
          Alert.alert(
            translate('annoucementTitle'),
            translate('feedbackSendLimitExceeded')
          )
          return
        default:
          break
      }

      const uri = await viewShotRef.current.capture()
      setScreenShotBase64(await RNFS.readFile(uri, 'base64'))

      setReportModalShow(true)
    } catch (err) {
      console.error(err)
      Alert.alert(translate('errorTitle'), translate('reportError'))
    }
  }

  const handleNewReportModalClose = () => {
    setReportDescription('')
    setScreenShotBase64('')
    setReportModalShow(false)
  }

  const handleReportSend = useCallback(() => {
    if (reportDescription.length < descriptionLowerLimit) {
      Alert.alert(
        translate('errorTitle'),
        translate('feedbackCharactersCountNotReached', {
          lowerLimit: descriptionLowerLimit,
        })
      )
      return
    }

    Alert.alert(translate('annoucementTitle'), translate('reportConfirmText'), [
      {
        text: translate('agree'),
        style: 'destructive',
        onPress: async () => {
          try {
            setSendingReport(true)
            await sendReport({
              reportType: 'feedback',
              description: reportDescription.trim(),
              screenShotBase64,
            })
            setSendingReport(false)
            Alert.alert(
              translate('annoucementTitle'),
              translate('reportSuccessText')
            )
            handleNewReportModalClose()
          } catch (err) {
            console.error(err)
            setSendingReport(false)
            Alert.alert(translate('errorTitle'), translate('reportError'))
          }
        },
      },
      {
        text: translate('disagree'),
        style: 'cancel',
      },
    ])
  }, [descriptionLowerLimit, reportDescription, screenShotBase64, sendReport])

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png' }}>
      <GestureDetector gesture={tap}>
        <View style={styles.root}>
          {/* eslint-disable-next-line no-undef */}
          {isDevApp && location && (
            <DevOverlay location={location as LocationObject} />
          )}
          <Header />
          {children}
          <NullableWarningPanel />
        </View>
      </GestureDetector>
      {!subscribing ? (
        <MirroringShareModal
          visible={msFeatureModalShow}
          onClose={handleMirroringShareModalClose}
        />
      ) : null}
      <NewReportModal
        visible={reportModalShow}
        sending={sendingReport}
        onClose={handleNewReportModalClose}
        description={reportDescription}
        onDescriptionChange={setReportDescription}
        onSubmit={handleReportSend}
        descriptionLowerLimit={descriptionLowerLimit}
      />
    </ViewShot>
  )
}

export default React.memo(PermittedLayout)

import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import React, { useCallback } from 'react'
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRecoilState } from 'recoil'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import tuningState from '../store/atoms/tuning'
import { translate } from '../translation'
import FAB from './FAB'
import Heading from './Heading'
import Typography from './Typography'
import { FONTS, LED_THEME_BG_COLOR } from '../constants'

const styles = StyleSheet.create({
  root: {
    height: Dimensions.get('window').height,
    paddingVertical: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  settingItemGroupTitle: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    marginTop: 12,
  },
  settingItemTitle: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
    marginTop: 12,
  },
  settingItemUnit: { fontSize: RFValue(12), fontWeight: 'bold', marginLeft: 8 },
  textInput: {
    width: '50%',
    height: 32,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#aaa',
    paddingHorizontal: 10,
  },
})

const TuningSettings: React.FC = () => {
  const [settings, setSettings] = useRecoilState(tuningState)
  const navigation = useNavigation()
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets()
  const isLEDTheme = useIsLEDTheme()

  const hasInvalidNumber =
    settings.bottomTransitionInterval < 0 ||
    settings.headerTransitionDelay < 0 ||
    settings.headerTransitionInterval < 0

  const onPressBack = useCallback(async () => {
    if (hasInvalidNumber) {
      Alert.alert(translate('errorTitle'), translate('nanErrorText'))
      return
    }
    if (settings.headerTransitionDelay > settings.headerTransitionInterval) {
      Alert.alert(
        translate('errorTitle'),
        translate('headerDelayTooShortErrorText')
      )
      return
    }

    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [
    hasInvalidNumber,
    navigation,
    settings.headerTransitionDelay,
    settings.headerTransitionInterval,
  ])

  const parseNumberFromText = (prev: number, text: string) =>
    Number.isNaN(Number(text)) ? prev : Number(text)

  const handleHeaderIntervalChange = (text: string) =>
    setSettings((prev) => ({
      ...prev,
      headerTransitionInterval: parseNumberFromText(
        prev.headerTransitionInterval,
        text
      ),
    }))
  const handleHeaderDelayChange = (text: string) =>
    setSettings((prev) => ({
      ...prev,
      headerTransitionDelay: parseNumberFromText(
        prev.headerTransitionDelay,
        text
      ),
    }))

  const handleBottomDelayChange = (text: string) =>
    setSettings((prev) => ({
      ...prev,
      bottomTransitionInterval: parseNumberFromText(
        prev.bottomTransitionInterval,
        text
      ),
    }))

  const handleLocationAccuracyChange = (accuracy: Location.LocationAccuracy) =>
    setSettings((prev) => ({ ...prev, locationAccuracy: accuracy }))

  const accuracyList = Object.entries(Location.LocationAccuracy)
    .filter(([key]) => !parseInt(key, 10))
    .map(([key, value]) => ({
      value,
      label: key,
    }))

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          ...styles.root,
          backgroundColor: isLEDTheme ? '#212121' : '#fff',
          paddingLeft: safeAreaLeft || 32,
          paddingRight: safeAreaRight || 32,
        }}
      >
        <Heading>{translate('tuning')}</Heading>
        <Typography style={styles.settingItemGroupTitle}>
          {translate('tuningItemTiming')}
        </Typography>

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemHeaderDelay')}
        </Typography>
        <View style={styles.settingItem}>
          <TextInput
            style={{
              ...styles.textInput,
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
            onChangeText={handleHeaderIntervalChange}
            value={settings.headerTransitionInterval.toString()}
            placeholder={settings.headerTransitionInterval.toString()}
            keyboardType="number-pad"
          />
          <Typography style={styles.settingItemUnit}>ms</Typography>
        </View>

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemHeaderDuration')}
        </Typography>
        <View style={styles.settingItem}>
          <TextInput
            style={{
              ...styles.textInput,
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
            onChangeText={handleHeaderDelayChange}
            value={settings.headerTransitionDelay.toString()}
            placeholder={settings.headerTransitionDelay.toString()}
            keyboardType="number-pad"
          />
          <Typography style={styles.settingItemUnit}>ms</Typography>
        </View>

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemBottomTransitionDelay')}
        </Typography>
        <View style={styles.settingItem}>
          <TextInput
            style={{
              ...styles.textInput,
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
            onChangeText={handleBottomDelayChange}
            value={settings.bottomTransitionInterval.toString()}
            placeholder={settings.bottomTransitionInterval.toString()}
            keyboardType="number-pad"
          />
          <Typography style={styles.settingItemUnit}>ms</Typography>
        </View>

        <Typography style={styles.settingItemGroupTitle}>
          {translate('tuningItemLocationAccuracy')}
        </Typography>
        <Picker
          selectedValue={settings.locationAccuracy}
          onValueChange={handleLocationAccuracyChange}
          dropdownIconColor={isLEDTheme ? '#fff' : '#000'}
        >
          {accuracyList.map((item) => (
            <Picker.Item
              key={item.value}
              color={isLEDTheme ? '#fff' : '#000'}
              style={{
                backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : undefined,
              }}
              label={item.label.toString()}
              value={item.value}
            />
          ))}
        </Picker>
      </ScrollView>
      <FAB onPress={onPressBack} icon="md-close" />
    </KeyboardAvoidingView>
  )
}

export default React.memo(TuningSettings)

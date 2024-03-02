import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import {
  GestureResponderEvent,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { useRecoilValue } from 'recoil'
import { GlyphNames } from '../@types/ionicons'
import { isLEDSelector } from '../store/selectors/isLED'

interface Props {
  icon: GlyphNames
  disabled?: boolean
  onPress: (event: GestureResponderEvent) => void
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 32,
    bottom: 32,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    shadowColor: '#008ffe',
    shadowOpacity: 0.25,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 2,
  },
  icon: {
    color: '#fff',
  },
})

const FAB: React.FC<Props> = ({ onPress, disabled, icon }: Props) => {
  const isLEDTheme = useRecoilValue(isLEDSelector)

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.fab,
        {
          backgroundColor: isLEDTheme ? '#212121' : '#008ffe',
          borderWidth: isLEDTheme ? 2 : 0,
          borderColor: '#fff',
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      disabled={disabled}
    >
      <Ionicons style={styles.icon} name={icon} size={32} />
    </TouchableOpacity>
  )
}

export default FAB

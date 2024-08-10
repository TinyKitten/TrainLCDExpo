import React, { useCallback, useMemo } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Station } from '../../gen/proto/stationapi_pb'
import { useThemeStore } from '../hooks/useThemeStore'
import { APP_THEME } from '../models/Theme'
import { isJapanese } from '../translation'
import Typography from './Typography'

const styles = StyleSheet.create({
  cell: { padding: 12 },
  stationNameText: {
    fontSize: RFValue(14),
  },
  descriptionText: {
    fontSize: RFValue(11),
    marginTop: 8,
  },
  separator: { height: 1, width: '100%', backgroundColor: '#aaa' },
})

const Separator = () => <View style={styles.separator} />

const ItemCell = ({
  item,
  onSelect,
}: {
  item: Station
  onSelect: (item: Station) => void
}) => {
  const ownLine = item.line
  const otherLines = useMemo(
    () => item.lines.filter((l) => l.id !== ownLine?.id),
    [item.lines, ownLine?.id]
  )
  const transferText = isJapanese ? '接続路線: ' : 'Transfers: '

  return (
    <TouchableOpacity style={styles.cell} onPress={() => onSelect(item)}>
      <Typography style={styles.stationNameText}>
        {isJapanese ? item.name : item.nameRoman}
      </Typography>
      <Typography style={styles.descriptionText}>
        {isJapanese ? ownLine?.nameShort : ownLine?.nameRoman}{' '}
        {otherLines.length ? transferText : ''}
        {otherLines
          .map((l) => (isJapanese ? l.nameShort : l.nameRoman))
          .join(isJapanese ? '、' : ', ')}
      </Typography>
    </TouchableOpacity>
  )
}

export const StationList = ({
  data,
  onSelect,
}: {
  data: Station[]
  onSelect: (item: Station) => void
}) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const renderItem = useCallback(
    ({ item }: { item: Station; index: number }) => {
      return <ItemCell item={item} onSelect={onSelect} />
    },
    [onSelect]
  )
  const keyExtractor = useCallback((item: Station) => item.id.toString(), [])
  const { bottom: safeAreaBottom } = useSafeAreaInsets()

  return (
    <FlatList
      initialNumToRender={data.length}
      style={{
        width: '100%',
        alignSelf: 'center',
        borderColor: isLEDTheme ? '#fff' : '#aaa',
        borderWidth: 1,
        flex: 1,
        marginVertical: 12,
        marginBottom: safeAreaBottom,
      }}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
      ListFooterComponent={Separator}
    />
  )
}

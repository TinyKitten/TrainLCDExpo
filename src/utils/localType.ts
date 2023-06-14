import { LineResponse, StationResponse } from '../gen/stationapi_pb'
import { APITrainType, APITrainTypeMinimum } from '../models/StationAPI'

// 100 = 普通
// 101 = 各駅停車
// 300 = 私鉄普通
// 301 = 私鉄各駅停車
export const getIsLocal = (tt: APITrainType | APITrainTypeMinimum): boolean =>
  tt?.typeId === 100 ||
  tt?.typeId === 101 ||
  tt?.typeId === 300 ||
  tt?.typeId === 301
export const getIsRapid = (tt: APITrainType | APITrainTypeMinimum): boolean =>
  tt?.typeId === 102 || tt?.typeId === 302

export const findLocalType = (
  currentStation: StationResponse.AsObject | null
): APITrainType | APITrainTypeMinimum | null => null
// currentStation?.trainTypes?.find((tt) => getIsLocal(tt)) ?? null

// JR中央線快速自動選択用
export const findRapidType = (
  currentStation: StationResponse.AsObject | null
): APITrainType | APITrainTypeMinimum | null => null
// currentStation?.trainTypes?.find((tt) => getIsRapid(tt)) ?? null
export const getIsChuoLineRapid = (
  currentLine: LineResponse.AsObject | null
): boolean =>
  // 11312: 中央線快速
  currentLine?.id === 11312

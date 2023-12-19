import { Station } from '../src/gen/stationapi_pb'

export const useNextStation = jest.fn().mockReturnValue(null)

export const setupMockUseNextStation = (station: Station.AsObject) =>
  useNextStation.mockReturnValue(station)

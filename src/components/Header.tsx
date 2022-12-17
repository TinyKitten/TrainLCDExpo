import React from 'react';
import { useRecoilValue } from 'recoil';
import { APP_THEME } from '../models/Theme';
import themeState from '../store/atoms/theme';
import CommonHeaderProps from './CommonHeaderProps';
import HeaderJRWest from './HeaderJRWest';
import HeaderSaikyo from './HeaderSaikyo';
import HeaderTokyoMetro from './HeaderTokyoMetro';
import HeaderTY from './HeaderTY';
import HeaderYamanote from './HeaderYamanote';

const Header = ({
  station,
  nextStation,
  line,
  isLast,
}: CommonHeaderProps): React.ReactElement => {
  const { theme } = useRecoilValue(themeState);

  switch (theme) {
    case APP_THEME.TokyoMetro:
    case APP_THEME.Toei:
      return (
        <HeaderTokyoMetro
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
    case APP_THEME.JRWest:
      return (
        <HeaderJRWest
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
    case APP_THEME.Yamanote:
      return (
        <HeaderYamanote
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
    case APP_THEME.TY:
      return (
        <HeaderTY
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
    case APP_THEME.Saikyo:
      return (
        <HeaderSaikyo
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
    default:
      return (
        <HeaderTokyoMetro
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
  }
};

export default React.memo(Header);

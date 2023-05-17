export const MARK_SHAPE = {
  NOOP: 'NOOP',
  ROUND: 'ROUND',
  REVERSED_ROUND: 'REVERSED_ROUND',
  REVERSED_ROUND_HORIZONTAL: 'REVERSED_ROUND_HORIZONTAL',
  MONOCHROME_ROUND: 'MONOCHROME_ROUND',
  SQUARE: 'SQUARE',
  REVERSED_SQUARE: 'REVERSED_SQUARE',
  REVERSED_SQUARE_DARK_TEXT: 'REVERSED_SQUARE_DARK_TEXT',
  REVERSED_SQUARE_WEST: 'REVERSED_SQUARE_WEST',
  REVERSED_SQUARE_WEST_DARK_TEXT: 'REVERSED_SQUARE_WEST_DARK_TEXT',
  HALF_SQUARE: 'HALF_SQUARE',
  HALF_SQUARE_WITHOUT_ROUND: 'HALF_SQUARE_WITHOUT_ROUND',
  HALF_SQUARE_DARK_TEXT: 'HALF_SQUARE_DARK_TEXT',
  ODAKYU: 'ODAKYU',
  HAKONE: 'HAKONE',
  KEIO: 'KEIO',
  TWR: 'TWR',
  NEW_SHUTTLE: 'NEW_SHUTTLE',
  KEIKYU: 'KEIKYU',
  KINTETSU: 'KINTETSU',
  NANKAI: 'NANKAI',
  KEIHAN: 'KEIHAN',
  HANKYU: 'HANKYU',
  HANSHIN: 'HANSHIN',
  SANYO: 'SANYO',
  JR_UNION: 'JR_UNION',
  BULLET_TRAIN_UNION: 'BULLET_TRAIN_UNION',
  NUMBER_ONLY: 'NUMBER_ONLY',
  KEISEI: 'KEISEI',
  NTL: 'NTL',
} as const;

export type MarkShapeKey = keyof typeof MARK_SHAPE;
export type MarkShape = typeof MARK_SHAPE[MarkShapeKey];

export const NUMBERING_ICON_SIZE = {
  DEFAULT: 'DEFAULT',
  MEDIUM: 'MEDIUM',
  SMALL: 'SMALL',
  TINY: 'TINY',
} as const;

// default: ヘッダーに使う
// medium: 乗り換え画面に使う
// small: 乗り換え案内に使う
// tiny: タブレット用LineBoardに使う
export type NumberingIconSize =
  typeof NUMBERING_ICON_SIZE[keyof typeof NUMBERING_ICON_SIZE];

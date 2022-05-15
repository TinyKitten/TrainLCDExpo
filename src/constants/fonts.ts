import { Platform } from 'react-native';

const FONTS = {
  FuturaLTPro: Platform.select({
    ios: 'Futura LT Pro',
    android: 'FuturaLTPro-Bold',
  }),
  MyriadPro: Platform.select({
    ios: 'Myriad Pro',
    android: 'myriadpro-bold',
  }),
  FrutigerNeueLTProBold: Platform.select({
    ios: 'Frutiger Neue LT Pro',
    android: 'FrutigerNeueLTPro-Bold',
  }),
};

export default FONTS;

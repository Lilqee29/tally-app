module.exports = {
  expo: {
    name: 'Tally',
    slug: 'tally-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.qomex.tally',
      entitlements: {
        'keychain-access-groups': [
          '$(AppIdentifierPrefix)com.qomex.tally.shared',
        ],
      },
        UIBackgroundModes: [],
      },
    },
    plugins: [
      [
        '@bacons/apple-targets',
        {
          appleTeamId: process.env.EXPO_APPLE_TEAM_ID || process.env.APPLE_TEAM_ID || 'AAAAAAAAAA',
        },
      ],
    ],
    assetBundlePatterns: ['**/*'],
    newArchEnabled: false,
  },
};

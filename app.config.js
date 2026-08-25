module.exports = {
  expo: {
    name: 'Tally',
    slug: 'tally-app',
    scheme: 'tally',
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
      deploymentTarget: '17.0',
      entitlements: {
        'keychain-access-groups': [
          '$(AppIdentifierPrefix)com.qomex.tally.shared',
        ],
      },
      infoPlist: {
        UIBackgroundModes: ['fetch'],
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

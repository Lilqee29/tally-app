import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useStore } from './src/store/useStore';
import { MainScreen } from './src/screens/MainScreen';
import { colors } from './src/theme/colors';

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const isLoaded = useStore((s) => s.isLoaded);

  useEffect(() => {
    hydrate();
  }, []);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.page, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text.secondary} />
      </View>
    );
  }

  return <MainScreen />;
}

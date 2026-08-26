import React, { useEffect } from 'react';
import { View, ActivityIndicator, Linking } from 'react-native';
import { useStore } from './src/store/useStore';
import { MainScreen } from './src/screens/MainScreen';
import { colors } from './src/theme/colors';

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const isLoaded = useStore((s) => s.isLoaded);
  const markDone = useStore((s) => s.markDone);
  const undoAnswer = useStore((s) => s.undoAnswer);
  const getTodayAnswer = useStore((s) => s.getTodayAnswer);
  const syncFromWidget = useStore((s) => s.syncFromWidget);

  useEffect(() => {
    hydrate();

    const handleUrl = (url: string | null) => {
      if (!url) return;
      try {
        if (url.includes('toggle/')) {
          const id = url.split('toggle/')[1]?.split('/')[0]?.split('?')[0];
          if (id) {
            const ans = getTodayAnswer(id);
            if (ans?.value === 'yes') {
              undoAnswer(id);
            } else {
              markDone(id);
            }
          }
        }
      } catch (e) {
        console.warn('Linking error:', e);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, []);

  // Poll Supabase for widget-originated changes every 5 seconds
  useEffect(() => {
    if (!isLoaded) return;

    const poll = () => {
      syncFromWidget().catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.page, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text.secondary} />
      </View>
    );
  }

  return <MainScreen />;
}

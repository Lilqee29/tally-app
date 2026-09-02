import React, { useEffect } from 'react';
import { View, ActivityIndicator, Linking, Text, StyleSheet, AppState } from 'react-native';
import { useStore } from './src/store/useStore';
import { MainScreen } from './src/screens/MainScreen';
import { colors } from './src/theme/colors';

function OfflineBanner() {
  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>
        Offline — showing cached data
      </Text>
    </View>
  );
}

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const isLoaded = useStore((s) => s.isLoaded);
  const isOnline = useStore((s) => s.isOnline);
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

  // Poll Supabase for widget-originated changes & sync immediately on app foreground
  useEffect(() => {
    if (!isLoaded) return;

    const poll = () => {
      syncFromWidget().catch(() => {});
    };

    poll();
    const interval = setInterval(poll, isOnline ? 5000 : 30000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        poll();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [isLoaded, isOnline]);

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.text.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}
      <MainScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: {
    backgroundColor: '#FF9500',
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  offlineText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
});

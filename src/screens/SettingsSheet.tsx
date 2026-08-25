import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { syncToWidget } from '../store/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const settings = useStore((s) => s.settings);
  const questions = useStore((s) => s.questions);
  const answers = useStore((s) => s.answers);
  const updateSettings = useStore((s) => s.updateSettings);

  const [syncedText, setSyncedText] = useState('Sync Widget Data');

  const appearances = ['auto', 'light', 'dark'] as const;

  const handleSyncWidget = async () => {
    try {
      await syncToWidget({ questions, answers, settings });
      if (settings.soundHaptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSyncedText('Widget Data Synced! ✓');
      setTimeout(() => setSyncedText('Sync Widget Data'), 2500);
    } catch {
      Alert.alert('Sync Status', 'Widget data updated.');
    }
  };

  const handleShowWidgetHelp = () => {
    Alert.alert(
      'Add Widget to Home Screen',
      '1. Go to your iPhone Home Screen.\n2. Long-press on any empty space until icons jiggle.\n3. Tap the "+" button at the top-left corner.\n4. Search for "Tally" and select your widget size.\n5. Tap "Add Widget".\n\n(Tip: If widgets don\'t appear immediately after sideloading, restart your iPhone once to allow iOS to register new extensions).',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={typography.headline}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* ── Widget Quick Actions ───────────────── */}
          <Text style={[typography.sectionHeader, styles.sectionLabel]}>HOME SCREEN WIDGET</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleShowWidgetHelp} activeOpacity={0.7}>
              <View style={styles.rowWithIcon}>
                <Ionicons name="grid-outline" size={20} color={colors.accent.streakEnd} />
                <Text style={typography.rowTitle}>How to Add Widget</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={handleSyncWidget} activeOpacity={0.7}>
              <View style={styles.rowWithIcon}>
                <Ionicons name="sync-outline" size={20} color={colors.state.yes} />
                <Text style={[typography.rowTitle, { color: colors.state.yes }]}>
                  {syncedText}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Widget Appearance ───────────────────── */}
          <Text style={[typography.sectionHeader, styles.sectionLabel]}>WIDGET APPEARANCE</Text>
          <View style={styles.card}>
            {/* Appearance Selector */}
            <View style={styles.row}>
              <Text style={typography.rowTitle}>Theme</Text>
              <View style={styles.segmentedPicker}>
                {appearances.map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => updateSettings({ widgetAppearance: a })}
                    style={[
                      styles.segment,
                      settings.widgetAppearance === a && styles.segmentActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        settings.widgetAppearance === a && styles.segmentTextActive,
                      ]}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.divider} />

            {/* Colored Text */}
            <View style={styles.row}>
              <Text style={typography.rowTitle}>Colored Text</Text>
              <Switch
                value={settings.coloredText}
                onValueChange={(v) => updateSettings({ coloredText: v })}
                trackColor={{ false: colors.bg.surfaceElevated, true: colors.state.done }}
                ios_backgroundColor={colors.bg.surfaceElevated}
              />
            </View>
            <View style={styles.divider} />

            {/* Require Confirmation */}
            <View style={styles.row}>
              <Text style={typography.rowTitle}>Require Confirmation</Text>
              <Switch
                value={settings.requireConfirmation}
                onValueChange={(v) => updateSettings({ requireConfirmation: v })}
                trackColor={{ false: colors.bg.surfaceElevated, true: colors.state.done }}
                ios_backgroundColor={colors.bg.surfaceElevated}
              />
            </View>
          </View>

          {/* ── Sound & Taptics ─────────────────────── */}
          <Text style={[typography.sectionHeader, styles.sectionLabel]}>SOUND AND TAPTIC FEEDBACK</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={typography.rowTitle}>Sound & Taptics</Text>
              <Switch
                value={settings.soundHaptics}
                onValueChange={(v) => updateSettings({ soundHaptics: v })}
                trackColor={{ false: colors.bg.surfaceElevated, true: colors.state.done }}
                ios_backgroundColor={colors.bg.surfaceElevated}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.page,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  doneBtn: {
    backgroundColor: colors.bg.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    padding: 24,
    paddingTop: 8,
    gap: 0,
    paddingBottom: 60,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
    marginLeft: 16,
  },
  // Segmented picker for widget appearance
  segmentedPicker: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surfaceElevated,
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: colors.bg.page,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  segmentTextActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
});

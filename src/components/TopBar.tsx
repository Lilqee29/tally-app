import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TallyLogo } from './TallyLogo';
import { colors } from '../theme/colors';

interface TopBarProps {
  isEditMode: boolean;
  onToggleEdit: () => void;
  onSettings: () => void;
}

export function TopBar({ isEditMode, onToggleEdit, onSettings }: TopBarProps) {
  return (
    <View style={styles.container}>
      {/* Wordmark — tally marks logo */}
      <TallyLogo size={34} />

      <View style={styles.right}>
        {/* Pencil (view mode) ↔ Checkmark (edit mode) */}
        <TouchableOpacity onPress={onToggleEdit} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={isEditMode ? 'checkmark' : 'pencil'}
            size={20}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {/* Settings gear */}
        <TouchableOpacity onPress={onSettings} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="settings-outline" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    padding: 2,
  },
});

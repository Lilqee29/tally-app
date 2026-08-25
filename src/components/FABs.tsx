import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface FABsProps {
  onAdd: () => void;
  onFlame: () => void;
  streakActive: boolean; // any question has streak > 0
}

export function FABs({ onAdd, onFlame, streakActive }: FABsProps) {
  const flameScale = useRef(new Animated.Value(1)).current;

  const handleFlame = () => {
    Animated.sequence([
      Animated.timing(flameScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(flameScale, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
    ]).start();
    onFlame();
  };

  return (
    <View style={styles.container}>
      {/* Flame FAB (44px) */}
      <Animated.View style={{ transform: [{ scale: flameScale }] }}>
        <TouchableOpacity onPress={handleFlame} style={styles.flameFab} activeOpacity={0.8}>
          {streakActive ? (
            <View style={[styles.flameFabInner, styles.flameActiveBg]}>
              <Ionicons name="flame" size={22} color="#FFFFFF" />
            </View>
          ) : (
            <View style={[styles.flameFabInner, { backgroundColor: colors.bg.surface }]}>
              <Ionicons name="flame-outline" size={22} color={colors.text.secondary} />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Add FAB (60px, primary) */}
      <TouchableOpacity onPress={onAdd} style={styles.addFab} activeOpacity={0.8}>
        <Ionicons name="add" size={32} color={colors.bg.page} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  // Add button
  addFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.control.neutral,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  // Flame button
  flameFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  flameFabInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameActiveBg: {
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeatmapGrid } from '../components/HeatmapGrid';
import { useStore } from '../store/useStore';
import { getHeatmapData, getStreak } from '../store/streaks';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface HeatmapSheetProps {
  visible: boolean;
  questionId: string | null;
  onClose: () => void;
}

export function HeatmapSheet({ visible, questionId, onClose }: HeatmapSheetProps) {
  const questions = useStore((s) => s.questions);
  const answers = useStore((s) => s.answers);
  const setQuestionDotColor = useStore((s) => s.setQuestionDotColor);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const question = questions.find((q) => q.id === questionId);
  if (!question) return null;

  const heatmapData = getHeatmapData(question.id, answers, 4);
  const streak = getStreak(question.id, answers);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={typography.headline}>Heatmap</Text>
          <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Question title row */}
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              {/* Dot color preview */}
              <View style={[styles.dotPreview, { backgroundColor: question.dotColor }]} />
              <Text style={[typography.rowTitle, { fontSize: 20, flex: 1 }]}>
                {question.title}
              </Text>
            </View>
            {/* ⚙ Color picker trigger */}
            <TouchableOpacity
              onPress={() => setShowColorPicker((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Dot color picker (inline) */}
          {showColorPicker && (
            <View style={styles.colorPicker}>
              <Text style={[typography.sectionHeader, { marginBottom: 10 }]}>DOT COLOR</Text>
              <View style={styles.colorRow}>
                {colors.dotColors.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      setQuestionDotColor(question.id, c);
                      setShowColorPicker(false);
                    }}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      question.dotColor === c && styles.colorSwatchSelected,
                    ]}
                  >
                    {question.dotColor === c && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Streak badge */}
          <View style={styles.streakRow}>
            <Ionicons name="flame" size={16} color={colors.accent.streakStart} />
            <Text style={[typography.timestamp, { color: colors.text.primary }]}>
              {' '}{streak} day streak
            </Text>
          </View>

          {/* Heatmap grid */}
          <HeatmapGrid data={heatmapData} dotColor={question.dotColor} />
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
    paddingTop: 8,
    paddingBottom: 60,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  dotPreview: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  // Color picker
  colorPicker: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    padding: 16,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
});

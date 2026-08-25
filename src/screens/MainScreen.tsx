import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useStore } from '../store/useStore';
import { TopBar } from '../components/TopBar';
import { TaskRow } from '../components/TaskRow';
import { FABs } from '../components/FABs';
import { AddEditSheet } from './AddEditSheet';
import { SettingsSheet } from './SettingsSheet';
import { HeatmapSheet } from './HeatmapSheet';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { getStreak } from '../store/streaks';
import { Question } from '../store/storage';

export function MainScreen() {
  const questions = useStore((s) => s.questions);
  const answers = useStore((s) => s.answers);
  const markDone = useStore((s) => s.markDone);
  const undoAnswer = useStore((s) => s.undoAnswer);
  const deleteQuestion = useStore((s) => s.deleteQuestion);
  const reorderQuestions = useStore((s) => s.reorderQuestions);
  const getTodayAnswer = useStore((s) => s.getTodayAnswer);

  const [isEditMode, setIsEditMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [heatmapQuestionId, setHeatmapQuestionId] = useState<string | null>(null);

  // Check if any question has an active streak (for flame FAB gradient)
  const streakActive = questions.some((q) => getStreak(q.id, answers) > 0);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Question', 'This will also remove all its history. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteQuestion(id),
      },
    ]);
  };

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Question>) => {
      const todayAnswer = getTodayAnswer(item.id);
      return (
        <ScaleDecorator>
          <TaskRow
            question={item}
            todayAnswer={todayAnswer}
            isEditMode={isEditMode}
            onPress={() => markDone(item.id)}
            onUndo={() => undoAnswer(item.id)}
            onDelete={() => handleDelete(item.id)}
            onDragStart={drag}
          />
        </ScaleDecorator>
      );
    },
    [isEditMode, answers]
  );

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <TopBar
        isEditMode={isEditMode}
        onToggleEdit={() => setIsEditMode((v) => !v)}
        onSettings={() => setShowSettings(true)}
      />

      {questions.length === 0 ? (
        // ── Empty state ──────────────────────────────
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyBody}>
            Tap{' '}
            <Text style={{ color: colors.control.neutral, fontWeight: '700' }}>+</Text>
            {' '}to add your first daily question.
          </Text>
        </View>
      ) : (
        // ── Task list ────────────────────────────────
        <DraggableFlatList
          data={sortedQuestions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reorderQuestions(data)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FABs */}
      <FABs
        onAdd={() => setShowAdd(true)}
        onFlame={() => {
          // Open heatmap for first question (user can navigate inside)
          if (questions.length > 0) {
            setHeatmapQuestionId(sortedQuestions[0].id);
          }
        }}
        streakActive={streakActive}
      />

      {/* Sheets */}
      <AddEditSheet
        visible={showAdd}
        onClose={() => setShowAdd(false)}
      />
      <SettingsSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <HeatmapSheet
        visible={heatmapQuestionId !== null}
        questionId={heatmapQuestionId}
        onClose={() => setHeatmapQuestionId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.page,
  },
  listContent: {
    paddingBottom: 140,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  emptyBody: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

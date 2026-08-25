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
import { useStore } from '../store/useStore';
import { TopBar } from '../components/TopBar';
import { TaskRow } from '../components/TaskRow';
import { FABs } from '../components/FABs';
import { AddEditSheet } from './AddEditSheet';
import { SettingsSheet } from './SettingsSheet';
import { HeatmapSheet } from './HeatmapSheet';
import { colors } from '../theme/colors';
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
  const [editingQuestion, setEditingQuestion] = useState<{ id: string; title: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [heatmapQuestionId, setHeatmapQuestionId] = useState<string | null>(null);

  // Check if any question has an active streak (for flame FAB highlight)
  const streakActive = questions.some((q) => getStreak(q.id, answers) > 0);

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  const handleDelete = (id: string) => {
    deleteQuestion(id);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedQuestions.length) return;

    const list = [...sortedQuestions];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    reorderQuestions(list);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Question; index: number }) => {
      const todayAnswer = getTodayAnswer(item.id);
      return (
        <TaskRow
          question={item}
          todayAnswer={todayAnswer}
          isEditMode={isEditMode}
          canMoveUp={index > 0}
          canMoveDown={index < sortedQuestions.length - 1}
          onPress={() => markDone(item.id)}
          onUndo={() => undoAnswer(item.id)}
          onDelete={() => handleDelete(item.id)}
          onEdit={() => setEditingQuestion({ id: item.id, title: item.title })}
          onMoveUp={() => handleMove(index, 'up')}
          onMoveDown={() => handleMove(index, 'down')}
        />
      );
    },
    [isEditMode, answers, sortedQuestions]
  );

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
        <FlatList
          data={sortedQuestions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FABs */}
      <FABs
        onAdd={() => {
          setEditingQuestion(null);
          setShowAdd(true);
        }}
        onFlame={() => {
          // Open heatmap for first question
          if (questions.length > 0) {
            setHeatmapQuestionId(sortedQuestions[0].id);
          }
        }}
        streakActive={streakActive}
      />

      {/* Sheets */}
      <AddEditSheet
        visible={showAdd || editingQuestion !== null}
        editingId={editingQuestion?.id ?? null}
        initialTitle={editingQuestion?.title ?? ''}
        onClose={() => {
          setShowAdd(false);
          setEditingQuestion(null);
        }}
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
    paddingTop: 14,
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

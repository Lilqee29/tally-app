import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Question, Answer } from '../store/storage';
import { formatAnswerTime } from '../store/streaks';

interface TaskRowProps {
  question: Question;
  todayAnswer?: Answer;
  isEditMode: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onPress: () => void;      // mark done / navigate to answer
  onUndo: () => void;       // reset today's answer
  onDelete: () => void;
  onEdit?: () => void;      // edit question title
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function TaskRow({
  question,
  todayAnswer,
  isEditMode,
  canMoveUp = false,
  canMoveDown = false,
  onPress,
  onUndo,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
}: TaskRowProps) {
  const isDone = todayAnswer?.value === 'yes';
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (isEditMode) {
      onEdit?.();
      return;
    }
    if (isDone) return; // tapping a done row does nothing (use refresh to undo)
    // Small bounce animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <View style={styles.rowWrapper}>
      {/* ── Edit mode: delete button leading ─────────── */}
      {isEditMode && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="remove-circle" size={22} color={colors.state.no} />
        </TouchableOpacity>
      )}

      {/* ── Main row ─────────────────────────────────── */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={isDone && !isEditMode ? 1 : 0.7}
        style={styles.rowContent}
      >
        {/* State circle */}
        {!isEditMode && (
          <Animated.View style={[{ transform: [{ scale }] }]}>
            {isDone ? (
              <View style={styles.circleChecked}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            ) : (
              <View style={styles.circlePending} />
            )}
          </Animated.View>
        )}

        {/* Text block */}
        <View style={styles.textBlock}>
          <Text
            style={!isEditMode && isDone ? typography.rowTitleDone : typography.rowTitle}
            numberOfLines={2}
          >
            {question.title}
          </Text>
          {!isEditMode && isDone && todayAnswer?.answeredAt && (
            <Text style={typography.timestamp}>
              {formatAnswerTime(todayAnswer.answeredAt)}
            </Text>
          )}
          {isEditMode && (
            <Text style={styles.tapToEditHint}>Tap to edit title</Text>
          )}
        </View>

        {/* Trailing controls */}
        <View style={styles.trailing}>
          {isEditMode ? (
            // Up/Down reorder handles
            <View style={styles.reorderGroup}>
              <TouchableOpacity
                onPress={onMoveUp}
                disabled={!canMoveUp}
                style={[styles.reorderBtn, !canMoveUp && { opacity: 0.2 }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="chevron-up" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onMoveDown}
                disabled={!canMoveDown}
                style={[styles.reorderBtn, !canMoveDown && { opacity: 0.2 }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          ) : (
            // Refresh/undo
            <TouchableOpacity
              onPress={isDone ? onUndo : undefined}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ opacity: isDone ? 1 : 0.2 }}
            >
              <Ionicons name="refresh" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Hairline divider */}
      <View style={styles.divider} />
    </View>
  );
}

const CIRCLE_SIZE = 28;

const styles = StyleSheet.create({
  rowWrapper: {
    paddingLeft: 24,
    position: 'relative',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 24,
    paddingVertical: 18,
    gap: 14,
  },
  deleteBtn: {
    position: 'absolute',
    left: 4,
    top: 21,
    zIndex: 10,
  },
  textBlock: {
    flex: 1,
    gap: 3,
    paddingLeft: 0,
  },
  tapToEditHint: {
    fontSize: 12,
    color: colors.state.yes,
    fontWeight: '500',
  },
  trailing: {
    minWidth: 28,
    alignItems: 'center',
  },
  reorderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reorderBtn: {
    padding: 4,
    backgroundColor: colors.bg.surfaceElevated,
    borderRadius: 6,
  },
  // Pending: dashed circle
  circlePending: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: '#48484A',
    borderStyle: 'dashed',
  },
  // Done: filled green with check
  circleChecked: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.state.done,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
    marginLeft: 0,
  },
});

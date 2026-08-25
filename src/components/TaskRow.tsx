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
  onPress: () => void;   // mark done / navigate to answer
  onUndo: () => void;    // reset today's answer
  onDelete: () => void;
  onDragStart?: () => void;
}

export function TaskRow({
  question,
  todayAnswer,
  isEditMode,
  onPress,
  onUndo,
  onDelete,
  onDragStart,
}: TaskRowProps) {
  const isDone = todayAnswer?.value === 'yes';
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
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
        activeOpacity={isDone ? 1 : 0.7}
        style={styles.rowContent}
        disabled={isEditMode}
      >
        {/* State circle */}
        <Animated.View style={[{ transform: [{ scale }] }]}>
          {isDone ? (
            <View style={styles.circleChecked}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          ) : (
            <View style={styles.circlePending} />
          )}
        </Animated.View>

        {/* Text block */}
        <View style={styles.textBlock}>
          <Text style={isDone ? typography.rowTitleDone : typography.rowTitle} numberOfLines={2}>
            {question.title}
          </Text>
          {isDone && todayAnswer?.answeredAt && (
            <Text style={typography.timestamp}>
              {formatAnswerTime(todayAnswer.answeredAt)}
            </Text>
          )}
        </View>

        {/* Trailing controls */}
        <View style={styles.trailing}>
          {isEditMode ? (
            // Hamburger reorder handle
            <TouchableOpacity onPressIn={onDragStart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="menu" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          ) : (
            // Refresh/undo (always rendered for layout stability, shown dimly when not done)
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
    left: -28,
    top: 18,
    zIndex: 10,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  trailing: {
    width: 28,
    alignItems: 'center',
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

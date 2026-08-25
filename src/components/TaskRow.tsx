import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Question, Answer } from '../store/storage';
import { formatAnswerTime } from '../store/streaks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = -75;

interface TaskRowProps {
  question: Question;
  todayAnswer?: Answer;
  isEditMode: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onPress: () => void;      // mark done / toggle
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
  const translateX = useRef(new Animated.Value(0)).current;

  // Swipe-to-delete gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isEditMode) return false;
        // Only horizontal left swipes
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 15;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          // Allow left swipe with resistance past threshold
          const dx = gestureState.dx < -120 ? -120 + (gestureState.dx + 120) * 0.2 : gestureState.dx;
          translateX.setValue(dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Open delete action
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  const handlePress = () => {
    if (isEditMode) {
      onEdit?.();
      return;
    }
    // If already swiped open, close it
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();

    // Toggle: If already done, toggle back to undo state. If not done, mark done!
    if (isDone) {
      onUndo();
    } else {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      onPress();
    }
  };

  const handleConfirmDelete = () => {
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDelete();
    });
  };

  return (
    <View style={styles.container}>
      {/* ── Background Swipe Action (Delete) ──────── */}
      {!isEditMode && (
        <View style={styles.swipeDeleteContainer}>
          <TouchableOpacity
            style={styles.swipeDeleteBtn}
            onPress={handleConfirmDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.swipeDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Main Sliding Row ──────────────────────── */}
      <Animated.View
        style={[
          styles.animatedRow,
          { transform: [{ translateX }] },
        ]}
        {...(!isEditMode ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          style={styles.rowContent}
        >
          {/* Edit mode delete (-) icon */}
          {isEditMode && (
            <TouchableOpacity
              style={styles.editModeDeleteBtn}
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="remove-circle" size={24} color={colors.state.no} />
            </TouchableOpacity>
          )}

          {/* State circle (normal mode) */}
          {!isEditMode && (
            <Animated.View style={[{ transform: [{ scale }] }]}>
              {isDone ? (
                <View style={styles.circleChecked}>
                  <Ionicons name="checkmark" size={17} color="#FFFFFF" />
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
                  <Ionicons name="chevron-up" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onMoveDown}
                  disabled={!canMoveDown}
                  style={[styles.reorderBtn, !canMoveDown && { opacity: 0.2 }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            ) : (
              // Toggle / Undo button
              <TouchableOpacity
                onPress={onUndo}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ opacity: isDone ? 1 : 0.25 }}
              >
                <Ionicons name="refresh" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* Hairline divider */}
        <View style={styles.divider} />
      </Animated.View>
    </View>
  );
}

const CIRCLE_SIZE = 28;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.page,
    overflow: 'hidden',
    position: 'relative',
  },
  swipeDeleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: colors.state.no,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeDeleteBtn: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  animatedRow: {
    backgroundColor: colors.bg.page,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 24,
    paddingVertical: 18,
    gap: 16,
  },
  editModeDeleteBtn: {
    marginRight: 4,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  tapToEditHint: {
    fontSize: 12,
    color: colors.state.yes,
    fontWeight: '500',
  },
  trailing: {
    minWidth: 32,
    alignItems: 'flex-end',
  },
  reorderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reorderBtn: {
    padding: 5,
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
    marginLeft: 24,
    marginRight: 24,
  },
});

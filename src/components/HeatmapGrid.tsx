import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { HeatmapColumn, DayDot } from '../store/streaks';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface HeatmapGridProps {
  data: HeatmapColumn[];
  dotColor: string; // per-question color
}

const DOT_SIZE = 9;
const DOT_GAP = 4;
const ROW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function HeatmapGrid({ data, dotColor }: HeatmapGridProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Day-of-week row labels */}
      <View style={styles.rowLabelsCol}>
        {/* Spacer for month header */}
        <View style={styles.monthLabelSpacer} />
        {ROW_LABELS.map((label, i) => (
          <View key={i} style={styles.dotCell}>
            <Text style={styles.rowLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Week columns */}
      {data.map((col, ci) => (
        <View key={col.weekStart || ci} style={styles.weekCol}>
          {/* Month label above column (only on first week of month) */}
          <View style={styles.monthLabelCell}>
            {col.monthLabel ? (
              <Text style={styles.monthLabel}>{col.monthLabel}</Text>
            ) : null}
          </View>

          {/* 7 day dots */}
          {col.days.map((dot, di) => (
            <DotCell key={di} dot={dot} dotColor={dotColor} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function DotCell({ dot, dotColor }: { dot: DayDot; dotColor: string }) {
  const bg = useMemo(() => {
    if (dot.state === 'future') return 'transparent';
    if (dot.state === 'yes') return dotColor;
    if (dot.state === 'no') return colors.bg.surfaceElevated;
    return colors.bg.surfaceElevated; // unanswered
  }, [dot.state, dotColor]);

  const borderColor = dot.isToday ? '#fff' : 'transparent';
  const opacity = dot.state === 'future' ? 0 : dot.state === 'unanswered' ? 0.35 : 1;

  return (
    <View style={styles.dotCell}>
      <View
        style={[
          styles.dot,
          { backgroundColor: bg, borderColor, opacity },
          dot.isToday && { borderWidth: 1.5 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  rowLabelsCol: {
    marginRight: DOT_GAP,
  },
  weekCol: {
    marginRight: DOT_GAP,
  },
  monthLabelCell: {
    height: 18,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  monthLabelSpacer: {
    height: 18 + 4,
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    width: DOT_SIZE + DOT_GAP,
    textAlign: 'center',
  },
  dotCell: {
    width: DOT_SIZE + DOT_GAP,
    height: DOT_SIZE + DOT_GAP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderColor: 'transparent',
  },
});

// Streak math, week history, and heatmap data helpers
import {
  format,
  subDays,
  startOfDay,
  parseISO,
  differenceInCalendarDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  startOfWeek,
  endOfWeek,
  subMonths,
} from 'date-fns';

export type DotState = 'yes' | 'no' | 'unanswered' | 'future';

export interface DayDot {
  date: string; // YYYY-MM-DD
  state: DotState;
  isToday: boolean;
}

export interface HeatmapColumn {
  weekStart: string; // YYYY-MM-DD
  days: DayDot[]; // always 7, Mon→Sun
  monthLabel?: string; // only set on first week of each month
}

/**
 * Returns today's date string YYYY-MM-DD
 */
export const today = (): string => format(new Date(), 'yyyy-MM-dd');

/**
 * Calculates current streak (consecutive YES days, ending today or yesterday).
 */
export function getStreak(
  questionId: string,
  answers: Array<{ questionId: string; date: string; value: 'yes' | 'no' }>
): number {
  const yesAnswers = new Set(
    answers
      .filter((a) => a.questionId === questionId && a.value === 'yes')
      .map((a) => a.date)
  );

  const todayStr = today();
  // Start from today or yesterday (grace for night owls)
  let cursor = yesAnswers.has(todayStr) ? new Date() : subDays(new Date(), 1);
  let streak = 0;

  while (true) {
    const dateStr = format(cursor, 'yyyy-MM-dd');
    if (yesAnswers.has(dateStr)) {
      streak++;
      cursor = subDays(cursor, 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Returns the last 7 days of dot states for the widget streak row.
 */
export function getWeekHistory(
  questionId: string,
  answers: Array<{ questionId: string; date: string; value: 'yes' | 'no' }>
): DayDot[] {
  const answerMap = new Map(
    answers
      .filter((a) => a.questionId === questionId)
      .map((a) => [a.date, a.value])
  );

  const todayStr = today();
  return Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const val = answerMap.get(dateStr);
    return {
      date: dateStr,
      isToday: dateStr === todayStr,
      state: val === 'yes' ? 'yes' : val === 'no' ? 'no' : 'unanswered',
    };
  });
}

/**
 * Builds heatmap columns for the last N months (default 4).
 * Each column = one week (Mon–Sun), rows indexed 0=Mon … 6=Sun.
 */
export function getHeatmapData(
  questionId: string,
  answers: Array<{ questionId: string; date: string; value: 'yes' | 'no' }>,
  monthsBack = 4
): HeatmapColumn[] {
  const answerMap = new Map(
    answers
      .filter((a) => a.questionId === questionId)
      .map((a) => [a.date, a.value])
  );

  const todayDate = startOfDay(new Date());
  const todayStr = format(todayDate, 'yyyy-MM-dd');

  // Range: start of (monthsBack months ago) → today
  const rangeStart = startOfWeek(startOfMonth(subMonths(todayDate, monthsBack - 1)), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(todayDate, { weekStartsOn: 1 });

  const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  // Group into weeks
  const columns: HeatmapColumn[] = [];
  let currentWeek: DayDot[] = [];
  let lastMonth = -1;

  allDays.forEach((day, idx) => {
    const dow = getDay(day); // 0=Sun…6=Sat
    const weekDayIdx = dow === 0 ? 6 : dow - 1; // Mon=0…Sun=6

    const dateStr = format(day, 'yyyy-MM-dd');
    const isFuture = differenceInCalendarDays(day, todayDate) > 0;
    const val = answerMap.get(dateStr);

    const dot: DayDot = {
      date: dateStr,
      isToday: dateStr === todayStr,
      state: isFuture
        ? 'future'
        : val === 'yes'
        ? 'yes'
        : val === 'no'
        ? 'no'
        : 'unanswered',
    };

    currentWeek[weekDayIdx] = dot;

    // End of week (Sunday = index 6)
    if (weekDayIdx === 6 || idx === allDays.length - 1) {
      // Fill any missing slots (shouldn't happen but safety)
      for (let i = 0; i < 7; i++) {
        if (!currentWeek[i]) {
          currentWeek[i] = { date: '', state: 'future', isToday: false };
        }
      }

      const weekStartDate = format(
        allDays[idx - weekDayIdx] || day,
        'yyyy-MM-dd'
      );

      const monthNum = day.getMonth();
      let monthLabel: string | undefined;
      if (monthNum !== lastMonth) {
        monthLabel = format(day, 'MMM');
        lastMonth = monthNum;
      }

      columns.push({ weekStart: weekStartDate, days: [...currentWeek], monthLabel });
      currentWeek = [];
    }
  });

  return columns;
}

/**
 * Formats a timestamp for display: "Tue 25, 11:14"
 */
export function formatAnswerTime(isoString: string): string {
  return format(parseISO(isoString), 'EEE d, HH:mm');
}

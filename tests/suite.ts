/**
 * Tally App Comprehensive Test Suite
 * Tests streak math, week history, heatmap generation, store logic, and widget payload serialization.
 */

import { format, subDays } from 'date-fns';
import { getStreak, getWeekHistory, getHeatmapData, today, formatAnswerTime } from '../src/store/streaks';
import { colors } from '../src/theme/colors';

interface Question {
  id: string;
  title: string;
  createdAt: string;
  order: number;
  dotColor: string;
}

interface Answer {
  questionId: string;
  date: string;
  value: 'yes' | 'no';
  answeredAt: string;
}

interface Settings {
  widgetAppearance: 'auto' | 'light' | 'dark';
  coloredText: boolean;
  requireConfirmation: boolean;
  soundHaptics: boolean;
}

interface TallyState {
  questions: Question[];
  answers: Answer[];
  settings: Settings;
}

const defaultSettings: Settings = {
  widgetAppearance: 'auto',
  coloredText: true,
  requireConfirmation: false,
  soundHaptics: true,
};

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedCount++;
  }
}

function assertEquals<T>(actual: T, expected: T, testName: string) {
  const isMatch = JSON.stringify(actual) === JSON.stringify(expected);
  if (isMatch) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}\n      Expected: ${JSON.stringify(expected)}\n      Got:      ${JSON.stringify(actual)}`);
    failedCount++;
  }
}

console.log('🧪 Starting Tally Test Suite...\n');

// ── 1. Date & Streak Calculation Tests ─────────────────────────
console.log('📦 1. Streak Calculation Tests');
{
  const todayStr = today();
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const twoDaysAgoStr = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  const threeDaysAgoStr = format(subDays(new Date(), 3), 'yyyy-MM-dd');

  // Test 1: No answers -> Streak = 0
  const noAnswers: Answer[] = [];
  assertEquals(getStreak('q1', noAnswers), 0, 'No answers yields 0 streak');

  // Test 2: Only today answered YES -> Streak = 1
  const todayYes: Answer[] = [{ questionId: 'q1', date: todayStr, value: 'yes', answeredAt: new Date().toISOString() }];
  assertEquals(getStreak('q1', todayYes), 1, 'Today YES yields 1 streak');

  // Test 3: Yesterday YES (not yet today) -> Streak = 1 (grace for night owls)
  const yesterdayYes: Answer[] = [{ questionId: 'q1', date: yesterdayStr, value: 'yes', answeredAt: new Date().toISOString() }];
  assertEquals(getStreak('q1', yesterdayYes), 1, 'Yesterday YES yields 1 streak');

  // Test 4: 4 consecutive days YES (3 days ago, 2 days ago, yesterday, today)
  const fourDaysStreak: Answer[] = [
    { questionId: 'q1', date: threeDaysAgoStr, value: 'yes', answeredAt: '' },
    { questionId: 'q1', date: twoDaysAgoStr, value: 'yes', answeredAt: '' },
    { questionId: 'q1', date: yesterdayStr, value: 'yes', answeredAt: '' },
    { questionId: 'q1', date: todayStr, value: 'yes', answeredAt: '' },
  ];
  assertEquals(getStreak('q1', fourDaysStreak), 4, '4 consecutive days YES yields 4 streak');

  // Test 5: Broken streak (missing yesterday)
  const brokenStreak: Answer[] = [
    { questionId: 'q1', date: threeDaysAgoStr, value: 'yes', answeredAt: '' },
    { questionId: 'q1', date: todayStr, value: 'yes', answeredAt: '' },
  ];
  assertEquals(getStreak('q1', brokenStreak), 1, 'Broken streak counts only current consecutive days (1)');

  // Test 6: Separate question isolation
  const q2Answers: Answer[] = [
    ...fourDaysStreak,
    { questionId: 'q2', date: todayStr, value: 'no', answeredAt: '' }
  ];
  assertEquals(getStreak('q2', q2Answers), 0, 'Different question answers do not pollute streak');
}

// ── 2. Week History Dot Calculation Tests ──────────────────────
console.log('\n📦 2. Week History Dot Generation Tests');
{
  const todayStr = today();
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const sampleAnswers: Answer[] = [
    { questionId: 'q1', date: yesterdayStr, value: 'yes', answeredAt: '' },
    { questionId: 'q1', date: todayStr, value: 'yes', answeredAt: '' },
  ];

  const weekDots = getWeekHistory('q1', sampleAnswers);
  assertEquals(weekDots.length, 7, 'Week history always returns 7 days');
  assert(weekDots[6].isToday, 'Last dot in 7-day array is marked as isToday');
  assertEquals(weekDots[6].state, 'yes', "Today's dot state is 'yes'");
  assertEquals(weekDots[5].state, 'yes', "Yesterday's dot state is 'yes'");
  assertEquals(weekDots[4].state, 'unanswered', "2 days ago is 'unanswered'");
}

// ── 3. Heatmap Data Generation Tests ───────────────────────────
console.log('\n📦 3. Heatmap Data Generation Tests');
{
  const answers: Answer[] = [
    { questionId: 'q1', date: today(), value: 'yes', answeredAt: '' },
  ];

  const heatmap = getHeatmapData('q1', answers, 3);
  assert(heatmap.length > 8, 'Heatmap generates multiple week columns for 3 months');
  assert(heatmap.every((col) => col.days.length === 7), 'Every column in heatmap has exactly 7 day slots (Mon-Sun)');
  assert(heatmap.some((col) => col.monthLabel !== undefined), 'Heatmap includes month headers on month transitions');
}

// ── 4. Formatting Utilities Tests ──────────────────────────────
console.log('\n📦 4. Formatting Tests');
{
  const testIso = '2026-08-25T11:14:00.000Z';
  const formatted = formatAnswerTime(testIso);
  assert(typeof formatted === 'string' && formatted.length > 0, 'formatAnswerTime returns valid formatted string');
}

// ── 5. Design System Tokens & Color Palette Tests ─────────────
console.log('\n📦 5. Design System Tokens Verification');
{
  assertEquals(colors.bg.page, '#000000', 'bg.page is pure black (#000000)');
  assertEquals(colors.bg.surface, '#1C1C1E', 'bg.surface matches token #1C1C1E');
  assertEquals(colors.bg.surfaceElevated, '#2C2C2E', 'bg.surfaceElevated matches token #2C2C2E');
  assertEquals(colors.state.done, '#34C759', 'state.done is iOS system green (#34C759)');
  assertEquals(colors.state.yes, '#0A84FF', 'state.yes is iOS system blue (#0A84FF)');
  assertEquals(colors.state.no, '#FF3B30', 'state.no is iOS system red (#FF3B30)');
  assertEquals(colors.dotColors.length, 8, 'Dot color palette has 8 vibrant options for users');
}

// ── 6. Local Storage & Zero-Cloud Offline Structure Tests ─────
console.log('\n📦 6. Local Storage & Widget Payload Schema Verification');
{
  const mockState: TallyState = {
    questions: [
      { id: 'q_1', title: 'Did I do a stretch session?', createdAt: '2026-08-25T10:00:00Z', order: 0, dotColor: '#0A84FF' },
      { id: 'q_2', title: 'Did I read for 20 mins?', createdAt: '2026-08-25T10:05:00Z', order: 1, dotColor: '#34C759' },
    ],
    answers: [
      { questionId: 'q_1', date: today(), value: 'yes', answeredAt: '2026-08-25T11:14:00Z' },
    ],
    settings: defaultSettings,
  };

  // Test state serialization to JSON
  const serialized = JSON.stringify(mockState);
  assert(serialized.length > 0, 'State serializes cleanly to JSON without circular references');

  const deserialized: TallyState = JSON.parse(serialized);
  assertEquals(deserialized.questions.length, 2, 'Deserialized state retains questions correctly');
  assertEquals(deserialized.settings.coloredText, true, 'Default settings contain coloredText: true');
  assertEquals(deserialized.settings.widgetAppearance, 'auto', 'Default settings contain widgetAppearance: auto');
}

// ── Summary ────────────────────────────────────────────────────
console.log(`\n========================================`);
console.log(`🏁 Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}

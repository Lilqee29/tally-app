import { format } from 'date-fns';
import type { Answer, Question, TallyState } from './storage';

declare const process: { env: Record<string, string | undefined> };

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

interface WidgetTaskRow {
  id: string;
  title: string;
  display_order: number;
  dot_color: string;
  today_value: 'yes' | 'no' | null;
  answered_date: string | null;
  answered_at: string | null;
  active: boolean;
}

function isConfigured(): boolean {
  return SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;
}

function restUrl(path: string): string {
  return `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${path}`;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

export async function syncStateToSupabaseWidget(state: TallyState): Promise<void> {
  if (!isConfigured()) return;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const sortedQuestions = [...state.questions].sort((a, b) => a.order - b.order);
  const rows = sortedQuestions.map((question, index) => {
    const todayAnswer = state.answers.find(
      (answer) => answer.questionId === question.id && answer.date === todayStr
    );

    return {
      id: question.id,
      title: question.title,
      display_order: index,
      dot_color: question.dotColor,
      today_value: todayAnswer?.value ?? null,
      answered_date: todayAnswer ? todayStr : null,
      answered_at: todayAnswer?.answeredAt ?? null,
      active: true,
    };
  });

  await fetch(restUrl('widget_tasks'), {
    method: 'PATCH',
    headers: headers({
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    }),
    body: JSON.stringify({ active: false }),
  });

  if (rows.length === 0) return;

  const response = await fetch(restUrl('widget_tasks?on_conflict=id'), {
    method: 'POST',
    headers: headers({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`Supabase widget sync failed with ${response.status}`);
  }
}

export async function mergeSupabaseWidgetAnswers(state: TallyState): Promise<TallyState> {
  if (!isConfigured()) return state;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const params = new URLSearchParams({
    select: 'id,today_value,answered_date,answered_at,active',
    active: 'eq.true',
    today_value: 'eq.yes',
    answered_date: `eq.${todayStr}`,
  });

  const response = await fetch(restUrl(`widget_tasks?${params.toString()}`), {
    headers: headers(),
  });

  if (!response.ok) return state;

  const rows = (await response.json()) as WidgetTaskRow[];
  if (rows.length === 0) return state;

  const mergedAnswers = [...state.answers];

  for (const row of rows) {
    const question = state.questions.find((q: Question) => q.id === row.id);
    if (!question || row.today_value !== 'yes') continue;

    const existingIndex = mergedAnswers.findIndex(
      (answer: Answer) => answer.questionId === row.id && answer.date === todayStr
    );
    const mergedAnswer: Answer = {
      questionId: row.id,
      date: todayStr,
      value: 'yes',
      answeredAt: row.answered_at ?? new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      mergedAnswers[existingIndex] = mergedAnswer;
    } else {
      mergedAnswers.push(mergedAnswer);
    }
  }

  return { ...state, answers: mergedAnswers };
}

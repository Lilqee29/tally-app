import { create } from 'zustand';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
  Question,
  Answer,
  Settings,
  defaultSettings,
  loadState,
  saveState,
} from './storage';
import { colors } from '../theme/colors';

interface TallyStore {
  // State
  questions: Question[];
  answers: Answer[];
  settings: Settings;
  isLoaded: boolean;

  // Init
  hydrate: () => Promise<void>;

  // Questions
  addQuestion: (title: string) => void;
  updateQuestion: (id: string, title: string) => void;
  deleteQuestion: (id: string) => void;
  reorderQuestions: (newOrder: Question[]) => void;
  setQuestionDotColor: (id: string, color: string) => void;

  // Answers
  markDone: (questionId: string) => void;
  undoAnswer: (questionId: string) => void;
  getTodayAnswer: (questionId: string) => Answer | undefined;

  // Settings
  updateSettings: (patch: Partial<Settings>) => void;
}

let dotColorIndex = 0;

function nextDotColor(): string {
  const c = colors.dotColors[dotColorIndex % colors.dotColors.length];
  dotColorIndex++;
  return c;
}

export const useStore = create<TallyStore>((set, get) => ({
  questions: [],
  answers: [],
  settings: defaultSettings,
  isLoaded: false,

  // ── Hydrate from AsyncStorage ─────────────────────────────
  hydrate: async () => {
    const saved = await loadState();
    set({ ...saved, isLoaded: true });
    dotColorIndex = saved.questions.length; // continue color rotation
    await syncToWidget(saved);
  },

  // ── Questions ─────────────────────────────────────────────
  addQuestion: (title) => {
    const now = new Date().toISOString();
    const q: Question = {
      id: `q_${Date.now()}`,
      title: title.trim(),
      createdAt: now,
      order: get().questions.length,
      dotColor: nextDotColor(),
    };
    const updated = [...get().questions, q];
    set({ questions: updated });
    saveState({ questions: updated, answers: get().answers, settings: get().settings });
  },

  updateQuestion: (id, title) => {
    const updated = get().questions.map((q) =>
      q.id === id ? { ...q, title: title.trim() } : q
    );
    set({ questions: updated });
    saveState({ questions: updated, answers: get().answers, settings: get().settings });
  },

  deleteQuestion: (id) => {
    const updated = get().questions
      .filter((q) => q.id !== id)
      .map((q, i) => ({ ...q, order: i }));
    const answersUpdated = get().answers.filter((a) => a.questionId !== id);
    set({ questions: updated, answers: answersUpdated });
    saveState({ questions: updated, answers: answersUpdated, settings: get().settings });
  },

  reorderQuestions: (newOrder) => {
    const updated = newOrder.map((q, i) => ({ ...q, order: i }));
    set({ questions: updated });
    saveState({ questions: updated, answers: get().answers, settings: get().settings });
  },

  setQuestionDotColor: (id, color) => {
    const updated = get().questions.map((q) =>
      q.id === id ? { ...q, dotColor: color } : q
    );
    set({ questions: updated });
    saveState({ questions: updated, answers: get().answers, settings: get().settings });
  },

  // ── Answers ───────────────────────────────────────────────
  markDone: (questionId) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existing = get().answers.findIndex(
      (a) => a.questionId === questionId && a.date === todayStr
    );

    const newAnswer: Answer = {
      questionId,
      date: todayStr,
      value: 'yes',
      answeredAt: new Date().toISOString(),
    };

    const updated =
      existing >= 0
        ? get().answers.map((a, i) => (i === existing ? newAnswer : a))
        : [...get().answers, newAnswer];

    set({ answers: updated });
    saveState({ questions: get().questions, answers: updated, settings: get().settings });

    // Haptic
    if (get().settings.soundHaptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  undoAnswer: (questionId) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const updated = get().answers.filter(
      (a) => !(a.questionId === questionId && a.date === todayStr)
    );
    set({ answers: updated });
    saveState({ questions: get().questions, answers: updated, settings: get().settings });

    if (get().settings.soundHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  getTodayAnswer: (questionId) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return get().answers.find(
      (a) => a.questionId === questionId && a.date === todayStr
    );
  },

  // ── Settings ──────────────────────────────────────────────
  updateSettings: (patch) => {
    const updated = { ...get().settings, ...patch };
    set({ settings: updated });
    saveState({ questions: get().questions, answers: get().answers, settings: updated });
  },
}));

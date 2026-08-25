import AsyncStorage from '@react-native-async-storage/async-storage';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { today } from './streaks';

const APP_GROUP = 'group.com.qomex.tally';
const STORAGE_KEY = '@tally_state';

export interface Question {
  id: string;
  title: string;
  createdAt: string;
  order: number;
  dotColor: string; // hex color for heatmap dots, user-configurable
}

export interface Answer {
  questionId: string;
  date: string;        // YYYY-MM-DD
  value: 'yes' | 'no';
  answeredAt: string;  // ISO timestamp
}

export interface Settings {
  widgetAppearance: 'auto' | 'light' | 'dark';
  coloredText: boolean;
  requireConfirmation: boolean;
  soundHaptics: boolean;
}

export interface TallyState {
  questions: Question[];
  answers: Answer[];
  settings: Settings;
}

export const defaultSettings: Settings = {
  widgetAppearance: 'auto',
  coloredText: true,
  requireConfirmation: false,
  soundHaptics: true,
};

const emptyState: TallyState = {
  questions: [],
  answers: [],
  settings: defaultSettings,
};

/** Load full state from AsyncStorage */
export async function loadState(): Promise<TallyState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<TallyState>;
    return {
      questions: parsed.questions ?? [],
      answers: parsed.answers ?? [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return emptyState;
  }
}

/** Save full state to AsyncStorage and sync widget-readable data to App Group */
export async function saveState(state: TallyState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    await syncToWidget(state);
  } catch (e) {
    console.warn('[Tally] saveState error', e);
  }
}

/**
 * Write a slim, widget-readable snapshot to the shared App Group UserDefaults.
 * The Swift widget reads this JSON from the same key.
 */
export async function syncToWidget(state: TallyState): Promise<void> {
  try {
    const todayStr = today();
    const todayAnswers = state.answers.filter((a) => a.date === todayStr);

    const weekHistory: Record<string, Record<string, 'yes' | 'no'>> = {};
    // Build last-7-days history per question
    for (const q of state.questions) {
      weekHistory[q.id] = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const ds = d.toISOString().slice(0, 10);
        const ans = state.answers.find(
          (a) => a.questionId === q.id && a.date === ds
        );
        if (ans) weekHistory[q.id][ds] = ans.value;
      }
    }

    const widgetPayload = {
      questions: state.questions.map((q) => ({
        id: q.id,
        title: q.title,
        dotColor: q.dotColor,
      })),
      todayAnswers,
      weekHistory,
      appearance: state.settings.widgetAppearance || 'auto',
      coloredText: state.settings.coloredText,
      updatedAt: new Date().toISOString(),
    };

    await SharedGroupPreferences.setItem(
      'tally_widget_data',
      JSON.stringify(widgetPayload),
      APP_GROUP
    );
  } catch (e) {
    console.warn('[Tally] syncToWidget error:', e);
  }
}

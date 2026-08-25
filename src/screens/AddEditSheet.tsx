import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useStore } from '../store/useStore';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface AddEditSheetProps {
  visible: boolean;
  editingId?: string | null; // null = add mode
  initialTitle?: string;
  onClose: () => void;
}

export function AddEditSheet({
  visible,
  editingId,
  initialTitle = '',
  onClose,
}: AddEditSheetProps) {
  const addQuestion = useStore((s) => s.addQuestion);
  const updateQuestion = useStore((s) => s.updateQuestion);
  const [title, setTitle] = useState(initialTitle);

  const isEditMode = !!editingId;

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (isEditMode && editingId) {
      updateQuestion(editingId, trimmed);
    } else {
      addQuestion(trimmed);
    }
    setTitle('');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[typography.rowTitle, { fontSize: 17 }]}>
              {isEditMode ? 'Edit Question' : 'New Question'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={!title.trim()}>
              <Text style={[styles.saveText, !title.trim() && styles.saveTextDisabled]}>
                {isEditMode ? 'Save' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={[typography.sectionHeader, { marginBottom: 8 }]}>QUESTION</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder="Did I do a stretch session?"
                placeholderTextColor={colors.text.tertiary}
                value={title}
                onChangeText={setTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
                maxLength={120}
                multiline
              />
            </View>
            <Text style={styles.hint}>
              Keep it specific and in the "Did I…" format for best results.
            </Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.page,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  cancelBtn: { minWidth: 60 },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  saveBtn: { minWidth: 60, alignItems: 'flex-end' },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.state.yes,
  },
  saveTextDisabled: {
    opacity: 0.35,
  },
  content: {
    padding: 24,
  },
  inputCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  input: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '500',
    minHeight: 44,
  },
  hint: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text.tertiary,
  },
});

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  initDatabase,
  getAllCases,
  addCase,
  updateCase,
  deleteCase,
  type Case,
} from './src/storage/cases';
import { rescheduleAll } from './src/notifications';

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromISODate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

export default function App() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [court, setCourt] = useState('District Court Rampur');
  const [hearingDate, setHearingDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadCases() {
    const rows = await getAllCases();
    console.log(`Loaded ${rows.length} cases from SQLite`);
    setCases(rows);
    await rescheduleAll(rows);
  }

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await loadCases();
      } catch (e) {
        console.error('Init failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function openAddModal() {
    setEditingCase(null);
    setTitle('');
    setCaseNumber('');
    setCourt('District Court Rampur');
    setHearingDate(new Date());
    setShowDatePicker(false);
    setModalVisible(true);
  }

  function openEditModal(c: Case) {
    setEditingCase(c);
    setTitle(c.title);
    setCaseNumber(c.caseNumber);
    setCourt(c.court);
    setHearingDate(fromISODate(c.nextHearing));
    setShowDatePicker(false);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingCase(null);
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing case title', 'Please enter a case title.');
      return;
    }
    if (!caseNumber.trim()) {
      Alert.alert('Missing case number', 'Please enter a case number.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        caseNumber: caseNumber.trim(),
        court: court.trim() || 'District Court Rampur',
        nextHearing: toISODate(hearingDate),
      };
      if (editingCase) {
        await updateCase(editingCase.id, payload);
      } else {
        await addCase(payload);
      }
      await loadCases();
      setModalVisible(false);
      setEditingCase(null);
    } catch (e) {
      console.error('Save failed', e);
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editingCase) return;
    Alert.alert(
      'Delete case?',
      `"${editingCase.title}" will be removed permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCase(editingCase.id);
              await loadCases();
              setModalVisible(false);
              setEditingCase(null);
            } catch (e) {
              console.error('Delete failed', e);
              Alert.alert('Could not delete', 'Something went wrong.');
            }
          },
        },
      ]
    );
  }

  const isIOS = Platform.OS === 'ios';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>CaseDiary</Text>
            <Text style={styles.subtitle}>Rampur District Court</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f3a5f" />
          <Text style={styles.loadingText}>Loading cases…</Text>
        </View>
      ) : cases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No cases yet</Text>
          <Text style={styles.emptyText}>Tap "+ Add" to add your first case.</Text>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const days = daysUntil(item.nextHearing);
            const isUrgent = days <= 1;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openEditModal(item)}
              >
                <View style={[styles.card, isUrgent && styles.cardUrgent]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.caseTitle}>{item.title}</Text>
                    {isUrgent && <Text style={styles.urgentBadge}>URGENT</Text>}
                  </View>
                  <Text style={styles.caseNumber}>{item.caseNumber}</Text>
                  <Text style={styles.court}>{item.court}</Text>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Next hearing:</Text>
                    <Text style={styles.dateValue}>{formatDate(item.nextHearing)}</Text>
                  </View>
                  <Text style={styles.daysUntil}>
                    {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#fff' }}
          behavior={isIOS ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={closeModal} hitSlop={10}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              {editingCase ? 'Edit Case' : 'Add Case'}
            </Text>
            <Pressable onPress={handleSave} hitSlop={10} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.formContainer}>
            <Text style={styles.label}>Case title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. State vs. Ramesh Kumar"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>Case number</Text>
            <TextInput
              style={styles.input}
              value={caseNumber}
              onChangeText={setCaseNumber}
              placeholder="e.g. CRL/245/2025"
              placeholderTextColor="#aaa"
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Court</Text>
            <TextInput
              style={styles.input}
              value={court}
              onChangeText={setCourt}
              placeholder="District Court Rampur"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>Next hearing date</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ fontSize: 16, color: '#1a1a1a' }}>
                {formatDate(toISODate(hearingDate))}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={hearingDate}
                mode="date"
                display={isIOS ? 'inline' : 'default'}
                onChange={(_, selected) => {
                  if (isIOS) {
                    if (selected) setHearingDate(selected);
                  } else {
                    setShowDatePicker(false);
                    if (selected) setHearingDate(selected);
                  }
                }}
              />
            )}

            {isIOS && showDatePicker && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.doneButtonText}>Done picking date</Text>
              </TouchableOpacity>
            )}

            {editingCase && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete this case</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#1f3a5f',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#c9d6e6', marginTop: 2 },
  addButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { color: '#1f3a5f', fontWeight: '700', fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#555', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardUrgent: { borderLeftWidth: 5, borderLeftColor: '#d9534f' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  caseTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    paddingRight: 8,
  },
  urgentBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#d9534f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  caseNumber: { fontSize: 13, color: '#555', marginBottom: 2 },
  court: { fontSize: 13, color: '#777', marginBottom: 10 },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateLabel: { fontSize: 14, color: '#444' },
  dateValue: { fontSize: 14, fontWeight: '600', color: '#1f3a5f' },
  daysUntil: { fontSize: 12, color: '#d9534f', fontWeight: '600' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
  modalCancel: { fontSize: 16, color: '#888' },
  modalSave: { fontSize: 16, color: '#1f3a5f', fontWeight: '700' },
  formContainer: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  doneButton: {
    marginTop: 12,
    backgroundColor: '#1f3a5f',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  deleteButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9534f',
    backgroundColor: '#fff',
  },
  deleteButtonText: { color: '#d9534f', fontWeight: '600', fontSize: 15 },
});
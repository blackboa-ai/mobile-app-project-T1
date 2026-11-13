import React, { useEffect, useState, useRef } from 'react';
import {
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
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import {
  fetchLaws,
  fetchLawProvisions,
  type Law,
  type Provision,
} from './src/nyaykosh';
import { LIMITATION_TYPES, calculateDeadline, formatDisplayDate } from './src/limitation';

// --- Helpers ---
function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
function formatDaysText(days: number): string {
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
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

// ==========================================
// CUSTOM FLOATING DATE PICKER COMPONENT
// ==========================================
function CustomDatePicker({ date, setDate, label }: { date: Date, setDate: (d: Date) => void, label: string }) {
  const [show, setShow] = useState(false);
  const isIOS = Platform.OS === 'ios';

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (!isIOS) setShow(false); // Auto-close on Android
    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
      if (isIOS) setShow(false); // Auto-close on iOS when a date is tapped
    } else if (event.type === 'dismissed') {
      setShow(false);
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)}>
        <Text style={{ fontSize: 16, color: '#1a1a1a' }}>{formatDate(toISODate(date))}</Text>
      </TouchableOpacity>

      {/* Android Native Dialog */}
      {!isIOS && show && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* iOS Floating Modal Calendar */}
      {isIOS && (
        <Modal transparent visible={show} animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShow(false)}>
            <View style={styles.floatingCalendar}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <DateTimePicker
                value={date}
                mode="date"
                display="inline"
                onChange={onDateChange}
                style={{ width: 320, height: 320 }}
                themeVariant="light" // <--- THIS FORCES DARK TEXT ON WHITE BACKGROUND
              />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ==========================================
// SCREEN 1: CASES
// ==========================================
function CasesScreen() {
  const insets = useSafeAreaInsets();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);

  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [court, setCourt] = useState('District Court Rampur');
  const [hearingDate, setHearingDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadCases() {
    const rows = await getAllCases();
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
    setNotes('');
    setModalVisible(true);
  }

  function openEditModal(c: Case) {
    setEditingCase(c);
    setTitle(c.title);
    setCaseNumber(c.caseNumber);
    setCourt(c.court);
    setHearingDate(fromISODate(c.nextHearing));
    setNotes(c.notes ?? '');
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingCase(null);
  }

  async function handleSave() {
    if (!title.trim() || !caseNumber.trim()) {
      Alert.alert('Missing fields', 'Please enter at least a title and case number.');
      return;
    }
    try {
      setSaving(true);
      const payload = { title: title.trim(), caseNumber: caseNumber.trim(), court: court.trim() || 'District Court Rampur', nextHearing: toISODate(hearingDate), notes: notes.trim() };
      if (editingCase) await updateCase(editingCase.id, payload);
      else await addCase(payload);
      await loadCases();
      setModalVisible(false);
      setEditingCase(null);
    } catch (e) {
      console.error('Save failed', e);
      Alert.alert('Could not save', 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editingCase) return;
    Alert.alert('Delete case?', `"${editingCase.title}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCase(editingCase.id);
            await loadCases();
            setModalVisible(false);
            setEditingCase(null);
          } catch (e) { Alert.alert('Could not delete', 'Something went wrong.'); }
        },
      },
    ]);
  }

  const isIOS = Platform.OS === 'ios';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.title} numberOfLines={1}>CaseDiary</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Rampur District Court</Text>
          </View>
          <TouchableOpacity style={styles.headerButtonPrimary} onPress={openAddModal}>
            <Text style={styles.headerButtonPrimaryText}>+ Add Case</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f3a5f" />
        </View>
      ) : cases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No cases yet</Text>
          <Text style={styles.emptyText}>Tap "+ Add Case" to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const days = daysUntil(item.nextHearing);
            const isUrgent = days >= 0 && days <= 1;
            const isPast = days < 0;
            return (
              <TouchableOpacity activeOpacity={0.7} onPress={() => openEditModal(item)}>
                <View style={[styles.card, isUrgent && styles.cardUrgent, isPast && styles.cardPast]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.caseTitle}>{item.title}</Text>
                    {isUrgent && <Text style={styles.urgentBadge}>URGENT</Text>}
                    {isPast && <Text style={styles.overdueBadge}>OVERDUE</Text>}
                  </View>
                  <Text style={styles.caseNumber}>{item.caseNumber}</Text>
                  <Text style={styles.court}>{item.court}</Text>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Next hearing:</Text>
                    <Text style={styles.dateValue}>{formatDate(item.nextHearing)}</Text>
                  </View>
                  <Text style={[styles.daysUntil, isPast && { color: '#b71c1c' }]}>
                    {formatDaysText(days)}
                  </Text>
                  {item.notes ? <Text style={styles.notesIndicator}>📝 Has notes</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={isIOS ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Pressable onPress={closeModal}><Text style={styles.modalCancel}>Cancel</Text></Pressable>
            <Text style={styles.modalTitle}>{editingCase ? 'Edit Case' : 'Add Case'}</Text>
            <Pressable onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Case title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="State vs. Ramesh Kumar" placeholderTextColor="#888" />
            
            <Text style={styles.label}>Case number</Text>
            <TextInput style={styles.input} value={caseNumber} onChangeText={setCaseNumber} placeholder="CRL/245/2025" placeholderTextColor="#888" autoCapitalize="characters" />
            
            <Text style={styles.label}>Court</Text>
            <TextInput style={styles.input} value={court} onChangeText={setCourt} placeholder="District Court Rampur" placeholderTextColor="#888" />
            
            <CustomDatePicker date={hearingDate} setDate={setHearingDate} label="Next hearing date" />

            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} placeholder="Client to bring documents..." placeholderTextColor="#888" multiline textAlignVertical="top" />
            
            {editingCase && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete this case</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ==========================================
// SCREEN 2: LIMITATION CALCULATOR
// ==========================================
function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [judgmentDate, setJudgmentDate] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState(LIMITATION_TYPES[0]);
  const [deadline, setDeadline] = useState<Date | null>(null);

  function handleCalculate() {
    setDeadline(calculateDeadline(judgmentDate, selectedType.days));
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Limitation Calculator</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list} ref={scrollViewRef} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          
          <CustomDatePicker date={judgmentDate} setDate={setJudgmentDate} label="Judgment / Order Date" />

          <Text style={[styles.label, { marginTop: 24 }]}>Type of Proceeding</Text>
          <View style={styles.typeGrid}>
            {LIMITATION_TYPES.map((type) => (
              <TouchableOpacity key={type.label}
                style={[styles.typeButton, selectedType.label === type.label && styles.typeButtonActive]}
                onPress={() => { setSelectedType(type); setDeadline(null); }}>
                <Text style={[styles.typeButtonText, selectedType.label === type.label && styles.typeButtonTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.calcButton} onPress={handleCalculate}>
            <Text style={styles.calcButtonText}>Calculate Deadline</Text>
          </TouchableOpacity>

          {deadline && (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Last Date to File</Text>
              <Text style={styles.resultDate}>{formatDisplayDate(deadline)}</Text>
              <Text style={styles.resultHint}>Based on {selectedType.days} days from judgment.</Text>
            </View>
          )}
          <Text style={styles.disclaimer}>
            * Calculation based on standard calendar days. It does not automatically exclude court holidays. Always verify with latest court rules.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ==========================================
// SCREEN 3: LEGAL REFERENCE
// ==========================================
function LegalScreen() {
  const insets = useSafeAreaInsets();
  const [laws, setLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedLaw, setSelectedLaw] = useState<Law | null>(null);
  const [provisions, setProvisions] = useState<Provision[]>([]);
  const [loadingProvisions, setLoadingProvisions] = useState(false);
  const [selectedProvision, setSelectedProvision] = useState<Provision | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadAllLaws(); }, []);

  async function loadAllLaws() {
    try {
      setLoading(true); setError(null);
      const data = await fetchLaws();
      setLaws(data);
    } catch (e) {
      setError('Could not load laws. Check internet.');
    } finally { setLoading(false); }
  }

  const filteredLaws = laws.filter((law) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return law.title.toLowerCase().includes(q) || law.category.toLowerCase().includes(q);
  });

  async function openLaw(law: Law) {
    setSelectedLaw(law); setLoadingProvisions(true); setError(null);
    try {
      const data = await fetchLawProvisions(law.apiSlug);
      setProvisions(data);
    } catch (e) { setError('Could not load provisions.'); }
    finally { setLoadingProvisions(false); }
  }

  if (selectedProvision) {
    const sectionPrefix = selectedProvision.number ? `Section ${selectedProvision.number}: ` : '';
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => setSelectedProvision(null)} style={{ paddingBottom: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>← Close Section</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={2}>
            {sectionPrefix}{selectedProvision.title}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.card}>
            <Text style={{ fontSize: 16, color: '#333', lineHeight: 24 }}>{selectedProvision.text}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (selectedLaw) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => { setSelectedLaw(null); setProvisions([]); }} style={{ paddingBottom: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>← Back to Laws</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={2}>{selectedLaw.title}</Text>
        </View>
        {loadingProvisions ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1f3a5f" /></View>
        ) : (
          <FlatList
            data={provisions}
            keyExtractor={(item, index) => item.number || String(index)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
               const sectionNum = item.number ? `Section ${item.number}: ` : '';
               return (
                <TouchableOpacity onPress={() => setSelectedProvision(item)}>
                  <View style={styles.card}>
                    <Text style={styles.caseTitle}>{sectionNum}{item.title}</Text>
                    <Text style={styles.caseNumber}>Tap to read full text</Text>
                  </View>
                </TouchableOpacity>
               );
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Legal Reference</Text>
        <View style={styles.searchContainer}>
          <TextInput style={styles.searchInput} placeholder="Search laws (e.g. data)..." placeholderTextColor="#888" value={query} onChangeText={setQuery} />
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1f3a5f" /></View>
      ) : error ? (
        <View style={styles.emptyContainer}><Text style={styles.emptyTitle}>{error}</Text></View>
      ) : (
        <FlatList
          data={filteredLaws}
          keyExtractor={(item, index) => item.apiSlug || String(index)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyTitle}>No laws found</Text></View>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openLaw(item)}>
              <View style={styles.card}>
                <Text style={styles.caseTitle}>{item.title}</Text>
                <Text style={styles.court}>{item.category} • {item.year || 'Active'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ==========================================
// MAIN APP (TAB NAVIGATOR)
// ==========================================
const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: '#1f3a5f',
            tabBarInactiveTintColor: '#888',
            tabBarStyle: { paddingBottom: 5, height: 60 },
            tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: any;
              if (route.name === 'Cases') iconName = focused ? 'folder' : 'folder-outline';
              else if (route.name === 'Calculator') iconName = focused ? 'calculator' : 'calculator-outline';
              else if (route.name === 'Laws') iconName = focused ? 'book' : 'book-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Cases" component={CasesScreen} />
          <Tab.Screen name="Calculator" component={CalculatorScreen} />
          <Tab.Screen name="Laws" component={LegalScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#1f3a5f' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#c9d6e6', marginTop: 2 },
  headerButtonPrimary: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  headerButtonPrimaryText: { color: '#1f3a5f', fontWeight: '700', fontSize: 13 },
  searchContainer: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12 },
  searchInput: { height: 40, fontSize: 15, color: '#1a1a1a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  
  cardUrgent: { borderLeftWidth: 5, borderLeftColor: '#d9534f' },
  cardPast: { borderLeftWidth: 5, borderLeftColor: '#b71c1c', backgroundColor: '#fffafa' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  caseTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a', flex: 1, paddingRight: 8 },
  urgentBadge: { fontSize: 11, fontWeight: '700', color: '#ffffff', backgroundColor: '#d9534f', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  overdueBadge: { fontSize: 11, fontWeight: '700', color: '#ffffff', backgroundColor: '#b71c1c', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  
  caseNumber: { fontSize: 13, color: '#555', marginBottom: 2 },
  court: { fontSize: 13, color: '#777', marginBottom: 10 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateLabel: { fontSize: 14, color: '#444' },
  dateValue: { fontSize: 14, fontWeight: '600', color: '#1f3a5f' },
  daysUntil: { fontSize: 12, color: '#d9534f', fontWeight: '600' },
  notesIndicator: { fontSize: 12, color: '#666', marginTop: 6, fontStyle: 'italic' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd', backgroundColor: '#fff' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
  modalCancel: { fontSize: 16, color: '#888' },
  modalSave: { fontSize: 16, color: '#1f3a5f', fontWeight: '700' },
  formContainer: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#d0d7de', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1a1a1a', backgroundColor: '#fff', justifyContent: 'center' },
  notesInput: { minHeight: 100, paddingTop: 12 },
  deleteButton: { marginTop: 32, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#d9534f', backgroundColor: '#fff' },
  deleteButtonText: { color: '#d9534f', fontWeight: '600', fontSize: 15 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  typeButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  typeButtonActive: { backgroundColor: '#1f3a5f', borderColor: '#1f3a5f' },
  typeButtonText: { fontSize: 14, color: '#444' },
  typeButtonTextActive: { color: '#fff', fontWeight: '600' },
  calcButton: { marginTop: 24, backgroundColor: '#1f3a5f', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  calcButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultBox: { marginTop: 24, padding: 20, backgroundColor: '#e8f0fe', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#c2d7f5' },
  resultLabel: { fontSize: 14, color: '#444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  resultDate: { fontSize: 24, fontWeight: '800', color: '#1f3a5f', marginBottom: 8 },
  resultHint: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  disclaimer: { fontSize: 11, color: '#888', marginTop: 24, textAlign: 'center', lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  floatingCalendar: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '90%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  calendarTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
});
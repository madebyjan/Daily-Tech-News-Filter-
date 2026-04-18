import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import ExtantiaLogo from '../../assets/Extantia_Logo_White.svg';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const SIGNAL_URL =
  'https://raw.githubusercontent.com/madebyjan/Daily-Tech-News-Filter-/main/daily_signal.json';

const TOPICS = [
  { id: 'ai', label: 'Artificial Intelligence' },
  { id: 'climate', label: 'Climate Tech' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'deeptech', label: 'Deep Tech' },
  { id: 'biotech', label: 'Biotech' },
  { id: 'crypto', label: 'Web3 & Crypto' },
  { id: 'saas', label: 'SaaS & Enterprise' },
  { id: 'consumer', label: 'Consumer Tech' },
];

type Pick = {
  rank: number;
  title: string;
  source: string;
  url: string;
  why_it_matters: string;
};

type Signal = {
  date: string;
  picks: Pick[];
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

async function registerForPushNotifications() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    status = newStatus;
  }
  if (status !== 'granted') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Today's Signal is ready",
      body: "Your daily top 3 VC news picks are waiting.",
      sound: true,
    },
    trigger: { hour: 7, minute: 0, repeats: true, type: 'daily' } as any,
  });
}

export default function HomeScreen() {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [tab, setTab] = useState<'today' | 'saved' | 'digest'>('today');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const notificationListener = useRef<any>();

  async function loadData() {
    try {
      const ob = await AsyncStorage.getItem('onboarded');
      setOnboarded(ob === 'true');
      const sv = await AsyncStorage.getItem('saved_stories');
      if (sv) setSaved(JSON.parse(sv));
      const tp = await AsyncStorage.getItem('topics');
      if (tp) setSelectedTopics(JSON.parse(tp));
    } catch {}
  }

  async function toggleSave(url: string) {
    const next = saved.includes(url) ? saved.filter(u => u !== url) : [...saved, url];
    setSaved(next);
    await AsyncStorage.setItem('saved_stories', JSON.stringify(next));
  }

  async function toggleTopic(id: string) {
    const next = selectedTopics.includes(id)
      ? selectedTopics.filter(t => t !== id)
      : [...selectedTopics, id];
    setSelectedTopics(next);
  }

  async function finishOnboarding() {
    await AsyncStorage.setItem('onboarded', 'true');
    await AsyncStorage.setItem('topics', JSON.stringify(selectedTopics));
    setOnboarded(true);
    registerForPushNotifications();
  }

  async function fetchSignal() {
    try {
      const res = await fetch(SIGNAL_URL + '?t=' + Date.now());
      const data = await res.json();
      setSignal(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    fetchSignal();
    notificationListener.current = Notifications.addNotificationReceivedListener(() => fetchSignal());
    return () => Notifications.removeNotificationSubscription(notificationListener.current);
  }, []);

  function onRefresh() {
    setRefreshing(true);
    fetchSignal();
  }

  // Onboarding Screen
  if (onboarded === false) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.onboarding}>
          <ExtantiaLogo width={140} height={36} />
          <Text style={s.obTitle}>Your daily edge{'\n'}as an investor.</Text>
          <Text style={s.obSub}>Every morning at 7 AM, AI curates the 3 most relevant VC news stories — just for you. Select your focus areas:</Text>
          <View style={s.topicsGrid}>
            {TOPICS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[s.topicBtn, selectedTopics.includes(t.id) && s.topicBtnActive]}
                onPress={() => toggleTopic(t.id)}
              >
                <Text style={[s.topicText, selectedTopics.includes(t.id) && s.topicTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.startBtn} onPress={finishOnboarding}>
            <Text style={s.startBtnText}>Get started →</Text>
          </TouchableOpacity>
          <Text style={s.obFooter}>You can change your preferences anytime.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // In-App Browser
  if (webUrl) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: '#0E0E0E' }]}>
        <View style={s.browserHeader}>
          <TouchableOpacity onPress={() => setWebUrl(null)}>
            <Text style={s.browserClose}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.browserUrl} numberOfLines={1}>{webUrl.replace('https://', '')}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(webUrl)}>
            <Text style={s.browserOpen}>Open ↗</Text>
          </TouchableOpacity>
        </View>
        <WebView source={{ uri: webUrl }} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const savedPicks = signal?.picks.filter(p => saved.includes(p.url)) ?? [];
  const displayPicks = tab === 'saved' ? savedPicks : signal?.picks ?? [];

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={s.loadingText}>Fetching today's signal...</Text>
      </View>
    );
  }

  if (error || !signal) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Could not load signal.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchSignal}>
          <Text style={s.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const digestContent = signal.picks.map(p =>
    `#${p.rank} ${p.title}\n${p.why_it_matters}`
  ).join('\n\n');

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <ExtantiaLogo width={160} height={40} />
      <Text style={s.headline}>Daily Top 3{'\n'}VC News.</Text>
      <Text style={s.date}>{formatDate(signal.date)}</Text>

      {selectedTopics.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.topicPills}>
          {selectedTopics.map(id => {
            const t = TOPICS.find(t => t.id === id);
            return t ? (
              <View key={id} style={s.pill}>
                <Text style={s.pillText}>{t.label}</Text>
              </View>
            ) : null;
          })}
        </ScrollView>
      )}

      <View style={s.divider} />

      <View style={s.tabs}>
        {(['today', 'saved', 'digest'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'today' ? 'TODAY' : t === 'saved' ? `SAVED${saved.length > 0 ? ` (${saved.length})` : ''}` : 'DIGEST'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'digest' ? (
        <View style={s.digestBox}>
          <Text style={s.digestTitle}>Week in Review</Text>
          <Text style={s.digestText}>{digestContent}</Text>
        </View>
      ) : (
        <>
          {displayPicks.length === 0 && tab === 'saved' && (
            <Text style={s.emptyText}>No saved stories yet.{'\n'}Tap □ to bookmark a story.</Text>
          )}
          {displayPicks.map((pick) => {
            const isOpen = expanded === pick.rank;
            const isSaved = saved.includes(pick.url);
            return (
              <TouchableOpacity
                key={pick.rank}
                style={s.card}
                onPress={() => setExpanded(isOpen ? null : pick.rank)}
                activeOpacity={0.7}
              >
                <View style={s.cardTop}>
                  <Text style={s.source}>{pick.source.toUpperCase()}</Text>
                  <View style={s.cardTopRight}>
                    <Text style={s.rank}>0{pick.rank}</Text>
                    <TouchableOpacity onPress={() => toggleSave(pick.url)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={[s.bookmark, isSaved && s.bookmarkSaved]}>{isSaved ? '■' : '□'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={s.title}>{pick.title}</Text>
                <View style={s.whyRow}>
                  <View style={s.whyBar} />
                  <Text style={s.why}>{pick.why_it_matters}</Text>
                </View>
                {isOpen && (
                  <TouchableOpacity style={s.readBtn} onPress={() => setWebUrl(pick.url)}>
                    <Text style={s.readBtnText}>Read full article →</Text>
                  </TouchableOpacity>
                )}
                <View style={s.cardDivider} />
              </TouchableOpacity>
            );
          })}
        </>
      )}

      <Text style={s.footer}>Updated daily at 7:00 AM · Pull to refresh</Text>
    </ScrollView>
  );
}

const BG = '#0E0E0E';
const BORDER = '#2A2A2A';

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: BG },
  scroll:          { flex: 1, backgroundColor: BG },
  container:       { padding: 24, paddingTop: 70, paddingBottom: 48 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loadingText:     { marginTop: 14, fontSize: 13, color: '#666', letterSpacing: 0.5 },
  errorText:       { fontSize: 14, color: '#666', marginBottom: 16 },
  retryBtn:        { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, borderWidth: 0.5, borderColor: BORDER },
  retryText:       { fontSize: 13, color: '#fff' },
  onboarding:      { padding: 28, paddingTop: 60, paddingBottom: 48 },
  obTitle:         { fontSize: 34, fontWeight: '500', color: '#fff', lineHeight: 42, marginTop: 24, marginBottom: 16 },
  obSub:           { fontSize: 14, color: '#888', lineHeight: 22, marginBottom: 32 },
  topicsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 40 },
  topicBtn:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: BORDER },
  topicBtnActive:  { backgroundColor: '#fff', borderColor: '#fff' },
  topicText:       { fontSize: 13, color: '#888' },
  topicTextActive: { color: '#0E0E0E', fontWeight: '500' },
  startBtn:        { backgroundColor: '#fff', borderRadius: 4, padding: 16, alignItems: 'center', marginBottom: 16 },
  startBtnText:    { fontSize: 15, fontWeight: '500', color: '#0E0E0E' },
  obFooter:        { fontSize: 12, color: '#444', textAlign: 'center' },
  browserHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 0.5, borderColor: BORDER },
  browserClose:    { fontSize: 14, color: '#fff' },
  browserUrl:      { flex: 1, fontSize: 12, color: '#555', marginHorizontal: 12 },
  browserOpen:     { fontSize: 13, color: '#888' },
  headline:        { fontSize: 36, fontWeight: '500', color: '#fff', lineHeight: 42, marginBottom: 12, marginTop: 20 },
  date:            { fontSize: 13, color: '#555', marginBottom: 12 },
  topicPills:      { marginBottom: 16 },
  pill:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 0.5, borderColor: BORDER, marginRight: 8 },
  pillText:        { fontSize: 11, color: '#555' },
  divider:         { height: 0.5, backgroundColor: BORDER, marginBottom: 20 },
  tabs:            { flexDirection: 'row', gap: 20, marginBottom: 24 },
  tab:             { paddingBottom: 8 },
  tabActive:       { borderBottomWidth: 1, borderBottomColor: '#fff' },
  tabText:         { fontSize: 11, color: '#555', letterSpacing: 2 },
  tabTextActive:   { color: '#fff' },
  emptyText:       { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 40, lineHeight: 22 },
  digestBox:       { padding: 16, borderWidth: 0.5, borderColor: BORDER, borderRadius: 8 },
  digestTitle:     { fontSize: 16, fontWeight: '500', color: '#fff', marginBottom: 16 },
  digestText:      { fontSize: 13, color: '#888', lineHeight: 22 },
  card:            { marginBottom: 4 },
  cardTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTopRight:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  source:          { fontSize: 10, color: '#555', letterSpacing: 1.5 },
  rank:            { fontSize: 12, color: '#333' },
  bookmark:        { fontSize: 16, color: '#444' },
  bookmarkSaved:   { color: '#fff' },
  title:           { fontSize: 16, fontWeight: '500', color: '#fff', lineHeight: 24, marginBottom: 12 },
  whyRow:          { flexDirection: 'row', gap: 10, marginBottom: 16 },
  whyBar:          { width: 1, backgroundColor: '#444' },
  why:             { flex: 1, fontSize: 13, color: '#888', lineHeight: 20 },
  readBtn:         { marginBottom: 16, borderWidth: 0.5, borderColor: '#333', borderRadius: 4, padding: 12, alignItems: 'center' },
  readBtnText:     { fontSize: 13, color: '#fff', letterSpacing: 0.5 },
  cardDivider:     { height: 0.5, backgroundColor: BORDER, marginBottom: 24 },
  footer:          { textAlign: 'center', fontSize: 11, color: '#333', marginTop: 12, letterSpacing: 0.5 },
});
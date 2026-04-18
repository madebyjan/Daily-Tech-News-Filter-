import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
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
} from 'react-native';
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
    trigger: {
      hour: 7,
      minute: 0,
      repeats: true,
      type: 'daily',
    } as any,
  });
}

export default function HomeScreen() {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const notificationListener = useRef<any>();

  async function loadSaved() {
    try {
      const val = await AsyncStorage.getItem('saved_stories');
      if (val) setSaved(JSON.parse(val));
    } catch {}
  }

  async function toggleSave(url: string) {
    const next = saved.includes(url) ? saved.filter(u => u !== url) : [...saved, url];
    setSaved(next);
    await AsyncStorage.setItem('saved_stories', JSON.stringify(next));
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
    fetchSignal();
    loadSaved();
    registerForPushNotifications();
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      fetchSignal();
    });
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
    };
  }, []);

  function onRefresh() {
    setRefreshing(true);
    fetchSignal();
  }

  const savedPicks = signal?.picks.filter(p => saved.includes(p.url)) ?? [];
  const displayPicks = showSaved ? savedPicks : signal?.picks ?? [];

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

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <ExtantiaLogo width={160} height={40} />
      <Text style={s.headline}>Daily Top 3{'\n'}VC News.</Text>
      <Text style={s.date}>{formatDate(signal.date)}</Text>

      <View style={s.divider} />

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, !showSaved && s.tabActive]} onPress={() => setShowSaved(false)}>
          <Text style={[s.tabText, !showSaved && s.tabTextActive]}>TODAY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, showSaved && s.tabActive]} onPress={() => setShowSaved(true)}>
          <Text style={[s.tabText, showSaved && s.tabTextActive]}>
            SAVED {saved.length > 0 ? `(${saved.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {displayPicks.length === 0 && showSaved && (
        <Text style={s.emptyText}>No saved stories yet.{'\n'}Tap the bookmark icon to save a story.</Text>
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
              <TouchableOpacity style={s.readBtn} onPress={() => Linking.openURL(pick.url)}>
                <Text style={s.readBtnText}>Read full article →</Text>
              </TouchableOpacity>
            )}

            <View style={s.cardDivider} />
          </TouchableOpacity>
        );
      })}

      <Text style={s.footer}>Updated daily at 7:00 AM · Pull to refresh</Text>
    </ScrollView>
  );
}

const BG = '#0E0E0E';
const BORDER = '#2A2A2A';

const s = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: BG },
  container:     { padding: 24, paddingTop: 70, paddingBottom: 48 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loadingText:   { marginTop: 14, fontSize: 13, color: '#666', letterSpacing: 0.5 },
  errorText:     { fontSize: 14, color: '#666', marginBottom: 16 },
  retryBtn:      { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, borderWidth: 0.5, borderColor: BORDER },
  retryText:     { fontSize: 13, color: '#fff' },
  headline:      { fontSize: 36, fontWeight: '500', color: '#fff', lineHeight: 42, marginBottom: 12, marginTop: 20 },
  date:          { fontSize: 13, color: '#555', marginBottom: 28 },
  divider:       { height: 0.5, backgroundColor: BORDER, marginBottom: 20 },
  tabs:          { flexDirection: 'row', gap: 20, marginBottom: 24 },
  tab:           { paddingBottom: 8 },
  tabActive:     { borderBottomWidth: 1, borderBottomColor: '#fff' },
  tabText:       { fontSize: 11, color: '#555', letterSpacing: 2 },
  tabTextActive: { color: '#fff' },
  emptyText:     { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 40, lineHeight: 22 },
  card:          { marginBottom: 4 },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTopRight:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  source:        { fontSize: 10, color: '#555', letterSpacing: 1.5 },
  rank:          { fontSize: 12, color: '#333' },
  bookmark:      { fontSize: 16, color: '#444' },
  bookmarkSaved: { color: '#fff' },
  title:         { fontSize: 16, fontWeight: '500', color: '#fff', lineHeight: 24, marginBottom: 12 },
  whyRow:        { flexDirection: 'row', gap: 10, marginBottom: 16 },
  whyBar:        { width: 1, backgroundColor: '#444' },
  why:           { flex: 1, fontSize: 13, color: '#888', lineHeight: 20 },
  readBtn:       { marginBottom: 16, borderWidth: 0.5, borderColor: '#333', borderRadius: 4, padding: 12, alignItems: 'center' },
  readBtnText:   { fontSize: 13, color: '#fff', letterSpacing: 0.5 },
  cardDivider:   { height: 0.5, backgroundColor: BORDER, marginBottom: 24 },
  footer:        { textAlign: 'center', fontSize: 11, color: '#333', marginTop: 12, letterSpacing: 0.5 },
});
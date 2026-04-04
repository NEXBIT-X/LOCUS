import 'react-native-url-polyfill/auto'
import { useState, useEffect } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Constants from 'expo-constants'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import theme from './themes/colors'
import LocusLogo from './components/LocusLogo'
import HomeScreen from './screens/homescreen'
import TelemetryScreen from './screens/TelemetryScreen'
import WalletScreen from './screens/WalletScreen'
import IdentityScreen from './screens/IdentityScreen'
import {
  flushTelemetryQueue,
  initializeTelemetrySync,
  startAccelerometerBatching,
  startTelemetry,
  stopTelemetry,
} from './services/telemetry'
import { Session } from '@supabase/supabase-js'
import { AppStore, useAppStore } from './store/appStore'
import { useLocusData } from './hooks/useLocusData'

type Tab = 'overview' | 'telemetry' | 'wallet' | 'identity'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const isOnline = useAppStore((s: AppStore) => s.isOnline)
  const setOnline = useAppStore((s: AppStore) => s.setOnline)
  const worker = useAppStore((s: AppStore) => s.worker)
  const activePolicy = useAppStore((s: AppStore) => s.activePolicy)
  const { refresh } = useLocusData(session)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const teardownSync = initializeTelemetrySync()
    const teardownAccelerometer = startAccelerometerBatching()

    // Expo Go no longer supports Android remote notification APIs in SDK 53+.
    if (Constants.appOwnership !== 'expo') {
      import('expo-notifications').then((Notifications) => {
        Notifications.requestPermissionsAsync()
      })
    }

    return () => {
      teardownSync()
      teardownAccelerometer()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      return
    }

    if (isOnline) {
      startTelemetry().then((started) => {
        if (!started) {
          Alert.alert(
            'Telemetry unavailable',
            'Online mode is on, but background telemetry could not start. This usually means location permissions are denied or the current Expo environment does not support background tracking.',
          )
        }
      })
      refresh()

      if (Constants.appOwnership !== 'expo') {
        import('expo-notifications').then((Notifications) => {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Locus Zone Alert',
              body: 'IMD Flood Alert active in your current zone.',
            },
            trigger: null,
          })
        })
      }
    } else {
      stopTelemetry()
      flushTelemetryQueue()
      refresh()
    }
  }, [isOnline, session, setOnline, refresh])

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <Auth />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LocusLogo />
          <View>
            <Text style={styles.title}>LOCUS </Text>
            <Text style={styles.subtitle}>User</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.switchButton, isOnline && styles.switchButtonActive]}
            onPress={() => setOnline(!isOnline)}
          >
            <Text style={styles.switchText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutBtn} onPress={() => supabase.auth.signOut()}>
            <Text style={styles.signOutText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'overview' && (
          <HomeScreen
            workerId={session.user.id}
            activeCreditBalance={worker?.activeCreditBalance ?? 0}
            weeklyPremium={activePolicy?.weeklyPremium ?? 60}
          />
        )}
        {tab === 'telemetry' && <TelemetryScreen />}
        {tab === 'wallet' && (
          <WalletScreen
            weeklyPremium={activePolicy?.weeklyPremium ?? 60}
            layer1={activePolicy?.layer1 ?? 0}
            layer2={activePolicy?.layer2 ?? 0}
            activeCreditBalance={worker?.activeCreditBalance ?? 0}
          />
        )}
        {tab === 'identity' && <IdentityScreen session={session} />}
      </ScrollView>

      <View style={styles.bottomDock}>
        <DockButton label="Home" active={tab === 'overview'} onPress={() => setTab('overview')} />
        <DockButton
          label="Node"
          active={tab === 'telemetry'}
          onPress={() => setTab('telemetry')}
        />
        <DockButton label="Wallet" active={tab === 'wallet'} onPress={() => setTab('wallet')} />
        <DockButton
          label="Identity"
          active={tab === 'identity'}
          onPress={() => setTab('identity')}
        />
      </View>
    </SafeAreaView>
  )
}

function DockButton({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={[styles.dockButton, active && styles.dockButtonActive]} onPress={onPress}>
      <Text style={[styles.dockText, active && styles.dockTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
  header: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.sans,
    letterSpacing: 0,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  switchButton: {
    borderWidth: 1,
    borderColor: theme.colors.glassStroke,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  switchButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 180, 216, 0.2)',
  },
  switchText: {
    color: theme.colors.text,
    fontFamily: theme.typography.mono,
    fontSize: 11,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: theme.colors.glassStroke,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  signOutText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: 180,
  },
  bottomDock: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    borderRadius: theme.radius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassStroke,
    backgroundColor: 'rgba(20, 20, 23, 0.95)',
    flexDirection: 'row',
    padding: 8,
    justifyContent: 'space-between',
  },
  dockButton: {
    flex: 1,
    borderRadius: theme.radius.m,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dockButtonActive: {
    backgroundColor: 'rgba(0, 180, 216, 0.18)',
  },
  dockText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.sans,
    fontSize: 12,
  },
  dockTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
})
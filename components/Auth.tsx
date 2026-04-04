import React, { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../lib/supabase'
import theme from '../themes/colors'
import GlassCard from './GlassCard'
import LocusLogo from './LocusLogo'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      Alert.alert(error.message)
    }

    setLoading(false)
  }

  async function signUp() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      Alert.alert(error.message)
    } else {
      Alert.alert('Account created', 'You can sign in now.')
    }

    setLoading(false)
  }

  return (
    <View style={styles.wrapper}>
      <GlassCard>
        <View style={styles.brandRow}>
          <LocusLogo size={46} />
          <View>
            <Text style={styles.title}>LOCUS NODE</Text>
            <Text style={styles.subtitle}>Email and password access</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            onChangeText={setEmail}
            value={email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            onChangeText={setPassword}
            value={password}
            placeholder="Enter password"
            autoCapitalize="none"
            secureTextEntry
            style={styles.input}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={signIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, loading && styles.disabled]}
          onPress={signUp}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Telemetry runs only when you explicitly switch online.</Text>
      </GlassCard>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.l,
  },
  brandRow: {
    flexDirection: 'row',
    gap: theme.spacing.m,
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.mono,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  subtitle: {
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  block: {
    marginBottom: theme.spacing.m,
  },
  label: {
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.glassStroke,
    backgroundColor: 'rgba(4, 8, 12, 0.72)',
    color: theme.colors.text,
    borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    fontSize: 16,
  },
  button: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.m,
    backgroundColor: 'rgba(0, 180, 216, 0.15)',
    paddingVertical: theme.spacing.s,
    alignItems: 'center',
    marginTop: theme.spacing.s,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  disabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  footer: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.m,
    fontSize: 12,
    lineHeight: 18,
  },
})

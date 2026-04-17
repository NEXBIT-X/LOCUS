import React, { useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../lib/supabase'
import theme from '../themes/colors'
import GlassCard from './GlassCard'
import LocusLogo from './LocusLogo'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email])

  async function requestOtp() {
    if (!normalizedEmail) {
      Alert.alert('Email required', 'Enter your email to receive a one-time code.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      Alert.alert(error.message)
      setOtpSent(false)
    } else {
      setOtpSent(true)
      Alert.alert('Code sent', 'Check your email for the 6-digit login code.')
    }

    setLoading(false)
  }

  async function verifyOtp() {
    if (!normalizedEmail || !otp.trim()) {
      Alert.alert('Code required', 'Enter the one-time code from your email.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp.trim(),
      type: 'email',
    })

    if (error) {
      Alert.alert(error.message)
    } else {
      Alert.alert('Signed in', 'Your session is active.')
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
            <Text style={styles.subtitle}>Email OTP access</Text>
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
          <Text style={styles.label}>One-time code</Text>
          <TextInput
            onChangeText={setOtp}
            value={otp}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={requestOtp}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{otpSent ? 'Resend Code' : 'Send Login Code'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, loading && styles.disabled]}
          onPress={verifyOtp}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Verify Code</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Telemetry runs only when you explicitly switch online. OTP login is email-based and works with the Supabase auth provider already configured for this project.
        </Text>
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

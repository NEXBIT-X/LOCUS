import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { Session } from '@supabase/supabase-js'
import GlassCard from '../components/GlassCard'
import theme from '../themes/colors'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'

type Props = {
  session: Session
}

export default function IdentityScreen({ session }: Props) {
  const kycStatus = useAppStore((s) => s.kycStatus)
  const setKycStatus = useAppStore((s) => s.setKycStatus)
  const [uploading, setUploading] = useState(false)

  const uploadKycDocument = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
    if (picked.canceled) {
      return
    }

    const doc = picked.assets[0]
    setUploading(true)
    setKycStatus('uploaded')

    try {
      const response = await fetch(doc.uri)
      const blob = await response.blob()
      const ext = doc.name.split('.').pop() ?? 'jpg'
      const path = `${session.user.id}/kyc-${Date.now()}.${ext}`

      const upload = await supabase.storage.from('kyc').upload(path, blob, {
        contentType: doc.mimeType ?? 'application/octet-stream',
        upsert: false,
      })

      if (upload.error) {
        throw upload.error
      }

      const { error } = await supabase
        .from('workers')
        .upsert({ id: session.user.id, kyc_status: 'verified' }, { onConflict: 'id' })

      if (error) {
        throw error
      }

      Alert.alert('KYC Uploaded', 'Document received. Verification in progress.')
    } catch (error) {
      setKycStatus('rejected')
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setUploading(false)
    }
  }

  const simulateKycApproval = async () => {
    try {
      setUploading(true)
      setKycStatus('verified')
      const { error } = await supabase.from('workers').upsert({ id: session.user.id, kyc_status: 'verified' }, { onConflict: 'id' })

      if (error) {
        throw error
      }

      Alert.alert('Simulation complete', 'KYC status updated to verified for testing.')
    } catch (error) {
      setKycStatus('rejected')
      Alert.alert('Simulation failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.container}>
      <GlassCard>
        <Text style={styles.title}>Identity Verification</Text>
        <Text style={styles.sub}>Upload Aadhar/PAN for policy activation and payout routing.</Text>
        <View style={styles.statusRow}>
          <Text style={styles.label}>KYC Status</Text>
          <Text style={[styles.status, statusColor(kycStatus)]}>{kycStatus.toUpperCase()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, uploading && styles.disabled]}
          onPress={uploadKycDocument}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Upload KYC Document'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, uploading && styles.disabled]}
          onPress={simulateKycApproval}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>Simulate Verified KYC</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  )
}

const statusColor = (status: string) => {
  if (status === 'verified') return { color: theme.colors.success }
  if (status === 'rejected') return { color: theme.colors.danger }
  if (status === 'uploaded') return { color: theme.colors.warning }
  return { color: theme.colors.textMuted }
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.m,
    paddingBottom: 140,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  sub: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
  },
  label: {
    color: theme.colors.textMuted,
  },
  status: {
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  button: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.m,
    backgroundColor: 'rgba(0, 180, 216, 0.14)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    marginTop: 10,
    borderColor: theme.colors.glassStroke,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
})
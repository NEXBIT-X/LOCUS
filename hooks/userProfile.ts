import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'

export type WorkerProfile = {
    email: string | null
    id: string
    session: Session | null
    full_name: string | null
    trust_tier: number
    active_credit_balance: number
    created_at: string
    kyc_status: 'pending' | 'verified'
}

export function useUserProfile(session: Session | null) {
    const [profile, setProfile] = useState<WorkerProfile | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!session) {
            setProfile(null)
            return
        }

        const load = async () => {
            setLoading(true)
            try {
                const { data } = await supabase
                    .from('workers')
                    .select('full_name, trust_tier, active_credit_balance, created_at, kyc_status')
                    .eq('id', session.user.id)
                    .maybeSingle()

                setProfile({
                    email: session.user.email ?? null,
                    id: session.user.id,
                    session,
                    full_name: data?.full_name ?? null,
                    trust_tier: data?.trust_tier ?? 2,
                    active_credit_balance: Number(data?.active_credit_balance ?? 0),
                    created_at: data?.created_at ?? new Date().toISOString(),
                    kyc_status: (data?.kyc_status as WorkerProfile['kyc_status'] | undefined) ?? 'pending',
                })
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [session])

    return { profile, loading }
}





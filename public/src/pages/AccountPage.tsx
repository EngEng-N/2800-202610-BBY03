import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Trash2, User as UserIcon } from 'lucide-react'

type Me = { _id: string; username: string; createdAt?: string }

export default function AccountPage() {
    const navigate = useNavigate()
    const [me, setMe] = useState<Me | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' })
                if (!res.ok) {
                    navigate('/login')
                    return
                }
                const data = await res.json()
                if (!cancelled) setMe(data)
            } catch {
                if (!cancelled) setError('Could not load account.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [navigate])

    async function handleLogout() {
        setBusy(true)
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            navigate('/login')
        } catch {
            setError('Logout failed. Try again.')
            setBusy(false)
        }
    }

    async function handleDelete() {
        setBusy(true)
        try {
            const res = await fetch('/api/auth/me', {
                method: 'DELETE',
                credentials: 'include',
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data.error ?? 'Could not delete account.')
                setBusy(false)
                return
            }
            navigate('/')
        } catch {
            setError('Network error. Try again.')
            setBusy(false)
        }
    }

    return (
        <div className="min-h-screen w-full bg-[#1a1a2e] text-white flex flex-col">
            <div className="flex items-center gap-3 px-4 pt-10 pb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="bg-[#2a2a3e] p-3 rounded-2xl"
                    aria-label="Back"
                >
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-xl font-semibold">Account</h1>
            </div>

            <div className="px-4 flex-1 flex flex-col gap-4">
                {loading ? (
                    <p className="text-white/60 text-sm">Loading…</p>
                ) : (
                    <>
                        <div className="bg-[#2a2a3e] rounded-2xl p-5 flex items-center gap-4">
                            <div className="bg-[#1a1a2e] p-3 rounded-full">
                                <UserIcon size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-white/50">Signed in as</p>
                                <p className="text-lg font-semibold">{me?.username}</p>
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-300 text-sm text-center">{error}</p>
                        )}

                        <button
                            onClick={handleLogout}
                            disabled={busy}
                            className="w-full bg-[#2a2a3e] hover:bg-[#33334a] active:scale-95 transition-all rounded-2xl px-5 py-4 flex items-center gap-3 disabled:opacity-60"
                        >
                            <LogOut size={18} />
                            <span className="font-medium">Log out</span>
                        </button>

                        {!confirmingDelete ? (
                            <button
                                onClick={() => setConfirmingDelete(true)}
                                disabled={busy}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all rounded-2xl px-5 py-4 flex items-center gap-3 text-red-300 disabled:opacity-60"
                            >
                                <Trash2 size={18} />
                                <span className="font-medium">Delete account</span>
                            </button>
                        ) : (
                            <div className="bg-red-500/10 rounded-2xl p-5 flex flex-col gap-3">
                                <p className="text-sm text-red-200">
                                    This permanently deletes your account. This cannot be undone.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConfirmingDelete(false)}
                                        disabled={busy}
                                        className="flex-1 py-3 rounded-2xl bg-[#1a1a2e] text-white/70 text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={busy}
                                        className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60"
                                    >
                                        {busy ? 'Deleting…' : 'Delete forever'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

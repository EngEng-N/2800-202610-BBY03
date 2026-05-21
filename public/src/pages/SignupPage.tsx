import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function SignupPage() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!username.trim() || !email.trim() || !password) {
            setError('Username, email and password are required')
            return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError('Please enter a valid email address')
            return
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }
        if (password !== confirm) {
            setError('Passwords do not match')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    email: email.trim(),
                    password,
                }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data.error ?? 'Sign up failed')
                return
            }
            navigate('/map')
        } catch {
            setError('Network error. Try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-6 py-10 overflow-hidden">
            <img
                src="/bg.jpg"
                alt="background"
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            />
            <div className="absolute inset-0 bg-black/60 z-0" />

            <div className="relative w-full max-w-sm mx-auto z-10 text-white">
                <h1 className="text-4xl font-bold mb-8 text-center drop-shadow-lg">Sign Up</h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        className="w-full bg-white/10 text-white placeholder-white/60 border border-white/30 rounded-full px-5 py-3 focus:outline-none focus:border-white"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="w-full bg-white/10 text-white placeholder-white/60 border border-white/30 rounded-full px-5 py-3 focus:outline-none focus:border-white"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full bg-white/10 text-white placeholder-white/60 border border-white/30 rounded-full px-5 py-3 focus:outline-none focus:border-white"
                    />
                    <input
                        type="password"
                        placeholder="Confirm password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        className="w-full bg-white/10 text-white placeholder-white/60 border border-white/30 rounded-full px-5 py-3 focus:outline-none focus:border-white"
                    />

                    {error && (
                        <p className="text-red-300 text-sm text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-white text-black font-semibold text-lg py-4 rounded-full shadow-lg hover:bg-white/90 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed">
                        {submitting ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p className="mt-6 text-center text-white/80 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="underline font-medium">Log in</Link>
                </p>
            </div>
        </div>
    )
}

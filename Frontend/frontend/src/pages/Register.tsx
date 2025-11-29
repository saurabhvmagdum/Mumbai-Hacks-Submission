import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { authEndpoints } from '@/lib/api/endpoints'

export function Register() {
  const [aadhaar, setAadhaar] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'patient' | 'hospital' | 'superadmin'>('patient')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12)
    setAadhaar(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (aadhaar.length !== 12) {
      toast.error('Aadhaar number must be exactly 12 digits')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    setLoading(true)
    try {
      await authEndpoints.register({
        aadhaar_number: aadhaar,
        password,
        role,
        name: name.trim(),
      })

      toast.success('Registration successful! Please login.')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-cyan-50 dark:from-teal-950 dark:via-blue-950 dark:to-cyan-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-teal-200 dark:border-teal-800 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            <CardTitle className="text-2xl">Register</CardTitle>
          </div>
          <CardDescription className="text-teal-100">
            Create your Swasthya account
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aadhaar">Aadhaar Number</Label>
              <Input
                id="aadhaar"
                type="text"
                placeholder="123412341234"
                value={aadhaar}
                onChange={handleAadhaarChange}
                maxLength={12}
                required
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                {aadhaar.length}/12 digits (numeric only)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="patient">Patient</option>
                <option value="hospital">Hospital</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={loading || aadhaar.length !== 12 || password !== confirmPassword}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600"
            >
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-center text-muted-foreground mb-4">
              Already have an account?{' '}
              <Link to="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                Login here
              </Link>
            </p>
            <Link to="/">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


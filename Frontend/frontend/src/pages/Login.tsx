import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { authEndpoints } from '@/lib/api/endpoints'

export function Login() {
  const [aadhaar, setAadhaar] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()

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

    setLoading(true)
    try {
      const response = await authEndpoints.login({
        aadhaar_number: aadhaar,
        password,
      })

      const { token, user } = response.data
      
      // Use AuthContext login function
      authLogin(token, user)

      toast.success(`Welcome, ${user.name}!`)

      // Redirect based on role
      if (user.role === 'patient') {
        navigate('/patient/dashboard')
      } else if (user.role === 'hospital') {
        navigate('/hospital/dashboard')
      } else if (user.role === 'superadmin') {
        navigate('/admin/dashboard')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed')
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
            <CardTitle className="text-2xl">Login</CardTitle>
          </div>
          <CardDescription className="text-teal-100">
            Enter your Aadhaar number and password
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
                {aadhaar.length}/12 digits
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || aadhaar.length !== 12}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-center text-muted-foreground mb-4">
              Don't have an account?{' '}
              <Link to="/register" className="text-teal-600 hover:text-teal-700 font-medium">
                Register here
              </Link>
            </p>
            <Link to="/">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-xs font-semibold mb-2">Test Credentials:</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>Patient: 123412341234 / patient123</p>
              <p>Hospital: 987698769876 / hospital123</p>
              <p>Admin: 111122223333 / admin123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


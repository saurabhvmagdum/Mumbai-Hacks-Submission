import { useNavigate } from 'react-router-dom'
import { Activity, Heart, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function CoverPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-cyan-50 dark:from-teal-950 dark:via-blue-950 dark:to-cyan-950 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Activity className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-6xl sm:text-7xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
              Swasthya
            </h1>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
            India's Decentralized Health Intelligence Network
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Empowering healthcare through AI-driven intelligence, secure patient records, and seamless hospital operations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 border-2 border-teal-200 dark:border-teal-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur">
            <Heart className="h-12 w-12 text-teal-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Patient Care</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Secure access to your health records and medical history
            </p>
          </Card>
          <Card className="p-6 border-2 border-blue-200 dark:border-blue-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur">
            <Shield className="h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Blockchain-based health wallets with Aadhaar authentication
            </p>
          </Card>
          <Card className="p-6 border-2 border-cyan-200 dark:border-cyan-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur">
            <Users className="h-12 w-12 text-cyan-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Intelligent agents for forecasting, scheduling, and triage
            </p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white shadow-lg"
          >
            Login
          </Button>
          <Button
            onClick={() => navigate('/register')}
            variant="outline"
            className="w-full sm:w-auto px-8 py-6 text-lg border-2 border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950"
          >
            Register
          </Button>
        </div>
      </div>
    </div>
  )
}


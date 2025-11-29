import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Users, FileText, Activity } from 'lucide-react'
import { dashboardEndpoints } from '@/lib/api/endpoints'

export function HospitalDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hospitalData, setHospitalData] = useState<any>(null)
  const [stats, setStats] = useState({ patients: 0, records: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await dashboardEndpoints.getHospitalDashboard()
        setHospitalData(response.data.hospital)
        setStats({
          patients: response.data.patients?.length || 0,
          records: response.data.records?.length || 0,
        })
      } catch (error) {
        console.error('Error fetching hospital data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
          Hospital Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">Welcome, {hospitalData?.hospital_name || user?.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-teal-200 dark:border-teal-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Total Patients</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.patients}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Medical Records</CardTitle>
            <FileText className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.records}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Status</CardTitle>
            <Activity className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Badge variant="success">Operational</Badge>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Hospital ID</CardTitle>
            <Building2 className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-bold">{hospitalData?.hospital_id || 'N/A'}</p>
          </CardContent>
        </Card>
      </div>

      {hospitalData && (
        <Card>
          <CardHeader>
            <CardTitle>Hospital Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{hospitalData.hospital_name}</p>
              </div>
              {hospitalData.city && (
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{hospitalData.city}</p>
                </div>
              )}
              {hospitalData.state && (
                <div>
                  <p className="text-sm text-muted-foreground">State</p>
                  <p className="font-medium">{hospitalData.state}</p>
                </div>
              )}
              {hospitalData.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{hospitalData.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Access hospital management features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button onClick={() => navigate('/hospital/forecast')} className="w-full">
              Demand Forecast
            </Button>
            <Button onClick={() => navigate('/hospital/triage')} variant="outline" className="w-full">
              Triage & Acuity
            </Button>
            <Button onClick={() => navigate('/hospital/staff')} variant="outline" className="w-full">
              Staff Scheduling
            </Button>
            <Button onClick={() => navigate('/hospital/discharge')} variant="outline" className="w-full">
              Discharge Planning
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


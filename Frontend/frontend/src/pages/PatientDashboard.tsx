import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { User, FileText, Heart } from 'lucide-react'
import { dashboardEndpoints } from '@/lib/api/endpoints'

export function PatientDashboard() {
  const { user } = useAuth()
  const [patientData, setPatientData] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await dashboardEndpoints.getPatientDashboard()
        setPatientData(response.data.patient)
        setRecords(response.data.records || [])
      } catch (error) {
        console.error('Error fetching patient data:', error)
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
          Patient Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">Welcome, {user?.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-teal-200 dark:border-teal-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Aadhaar Number</CardTitle>
            <User className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{user?.aadhaar_number}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Medical Records</CardTitle>
            <FileText className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{records.length}</p>
            <p className="text-xs text-muted-foreground">Total records</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Profile Status</CardTitle>
            <Heart className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Badge variant="success" className="text-sm">
              Active
            </Badge>
          </CardContent>
        </Card>
      </div>

      {patientData && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{patientData.name}</p>
              </div>
              {patientData.date_of_birth && (
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{new Date(patientData.date_of_birth).toLocaleDateString()}</p>
                </div>
              )}
              {patientData.gender && (
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium">{patientData.gender}</p>
                </div>
              )}
              {patientData.blood_group && (
                <div>
                  <p className="text-sm text-muted-foreground">Blood Group</p>
                  <p className="font-medium">{patientData.blood_group}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Medical Records</CardTitle>
          <CardDescription>Your medical history and records</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Doctor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.record_id}>
                    <TableCell>
                      {new Date(record.record_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{record.hospital_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{record.record_type || 'General'}</Badge>
                    </TableCell>
                    <TableCell>{record.diagnosis || 'N/A'}</TableCell>
                    <TableCell>{record.doctor_name || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No medical records found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


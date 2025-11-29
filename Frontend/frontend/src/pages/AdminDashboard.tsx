import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Building2, Users, FileText, Settings, Calendar } from 'lucide-react'
import { dashboardEndpoints } from '@/lib/api/endpoints'

export function AdminDashboard() {
  const { user } = useAuth()
  const [hospitals, setHospitals] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [stats, setStats] = useState<{ total_patients?: number; total_hospitals?: number; total_records?: number }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await dashboardEndpoints.getAdminDashboard()
        setHospitals(response.data.hospitals || [])
        setAssignments(response.data.assignments || [])
        setStats(response.data.stats || {})
      } catch (error) {
        console.error('Error fetching admin data:', error)
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
          Super Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">Welcome, {user?.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-teal-200 dark:border-teal-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Total Patients</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total_patients || 0}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Total Hospitals</CardTitle>
            <Building2 className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total_hospitals || 0}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Total Records</CardTitle>
            <FileText className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total_records || 0}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Assignments</CardTitle>
            <Calendar className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assignments.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hospitals</CardTitle>
            <CardDescription>All registered hospitals in the network</CardDescription>
          </CardHeader>
          <CardContent>
            {hospitals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Patients</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hospitals.map((hospital) => (
                    <TableRow key={hospital.hospital_id}>
                      <TableCell className="font-medium">{hospital.hospital_name}</TableCell>
                      <TableCell>{hospital.city || 'N/A'}</TableCell>
                      <TableCell>{hospital.state || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{hospital.patient_count || 0}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No hospitals found</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>Hospital assignment history</CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.assignment_id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{assignment.hospital_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Assigned by {assignment.assigned_by_name}
                        </p>
                      </div>
                      <Badge
                        variant={assignment.status === 'active' ? 'success' : 'secondary'}
                      >
                        {assignment.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(assignment.assignment_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No assignments found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
          <CardDescription>Manage hospitals and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Manage Hospitals
            </Button>
            <Button variant="outline" className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              View Scheduling
            </Button>
            <Button variant="outline" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


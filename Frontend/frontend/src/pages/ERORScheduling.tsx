import { useState } from 'react'
import { useERQueue, useAddPatient } from '@/hooks'
import { erOrEndpoints } from '@/lib/api/endpoints'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar, UserPlus, GanttChart } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

export function ERORScheduling() {
  const [patientName, setPatientName] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [acuityLevel, setAcuityLevel] = useState('3')
  const [surgeryFile, setSurgeryFile] = useState<File | null>(null)

  const { data: queue } = useERQueue()
  const addPatientMutation = useAddPatient()
  const queryClient = useQueryClient()

  const { data: orSchedule } = useQuery({
    queryKey: ['or-schedule'],
    queryFn: () => erOrEndpoints.getORSchedule().then((res) => res.data),
  })

  const scheduleORMutation = useMutation({
    mutationFn: (data: { surgeries: Array<{ id: string; duration: number; priority: number }> }) =>
      erOrEndpoints.scheduleOR(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['or-schedule'] })
      toast.success('OR schedule generated successfully')
    },
    onError: (error: unknown) => {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as any).response?.data?.error || 'Failed to generate OR schedule'
        : 'Failed to generate OR schedule'
      toast.error(errorMessage)
    },
  })

  const handleAddPatient = () => {
    // Validation
    if (!patientName.trim()) {
      toast.error('Patient name is required')
      return
    }

    const age = parseInt(patientAge)
    if (!patientAge || isNaN(age) || age < 0 || age > 150) {
      toast.error('Please enter a valid age (0-150)')
      return
    }

    const acuity = parseInt(acuityLevel)
    if (acuity < 1 || acuity > 5) {
      toast.error('Acuity level must be between 1-5')
      return
    }

    addPatientMutation.mutate(
      {
        name: patientName.trim(),
        age: age,
        acuity_level: acuity,
        status: 'waiting',
      },
      {
        onSuccess: () => {
          // Reset form after successful addition
          setPatientName('')
          setPatientAge('')
          setAcuityLevel('3')
        },
      }
    )
  }

  const parseCSV = async (file: File): Promise<Array<{ id: string; duration: number; priority: number }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          
          // Skip header if present
          const dataLines = lines[0]?.toLowerCase().includes('id') || lines[0]?.toLowerCase().includes('duration') 
            ? lines.slice(1) 
            : lines
          
          const surgeries = dataLines
            .map((line, index) => {
              const parts = line.split(',').map(p => p.trim())
              // Expected format: id, duration, priority (or similar)
              if (parts.length >= 2) {
                const id = parts[0] || `surgery-${index + 1}`
                const duration = parseInt(parts[1]) || 120
                const priority = parseInt(parts[2]) || 3
                
                // Validate
                if (isNaN(duration) || duration < 0 || duration > 1440) {
                  throw new Error(`Invalid duration at line ${index + 1}: ${parts[1]}`)
                }
                if (isNaN(priority) || priority < 1 || priority > 5) {
                  throw new Error(`Invalid priority at line ${index + 1}: ${parts[2]}`)
                }
                
                return { id, duration, priority }
              }
              return null
            })
            .filter((s): s is { id: string; duration: number; priority: number } => s !== null)
          
          if (surgeries.length === 0) {
            throw new Error('No valid surgery data found in CSV file')
          }
          
          resolve(surgeries)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const handleScheduleOR = async () => {
    if (!surgeryFile) {
      toast.error('Please upload a CSV file with surgery data')
      return
    }

    // Validate file type
    if (!surgeryFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (surgeryFile.size > maxSize) {
      toast.error('File size must be less than 5MB')
      return
    }

    try {
      const surgeries = await parseCSV(surgeryFile)
      scheduleORMutation.mutate({ surgeries }, {
        onSuccess: () => {
          setSurgeryFile(null)
          // Reset file input
          const fileInput = document.getElementById('surgeryFile') as HTMLInputElement
          if (fileInput) fileInput.value = ''
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file'
      toast.error(errorMessage)
    }
  }

  const sortedQueue = queue
    ? [...queue].sort((a, b) => (b.acuity_level || 0) - (a.acuity_level || 0))
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ER/OR Scheduling</h1>
        <p className="text-muted-foreground">Manage emergency room and operating room schedules</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Patient to ER Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Patient Name</Label>
              <Input
                id="name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="45"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acuity">Acuity Level</Label>
                <Input
                  id="acuity"
                  type="number"
                  min="1"
                  max="5"
                  value={acuityLevel}
                  onChange={(e) => setAcuityLevel(e.target.value)}
                />
              </div>
            </div>
            <Button 
              onClick={handleAddPatient} 
              disabled={!patientName || !patientAge || addPatientMutation.isPending}
            >
              {addPatientMutation.isPending ? 'Adding...' : 'Add to Queue'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GanttChart className="h-5 w-5" />
              OR Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="surgeryFile">Upload Surgery List (CSV)</Label>
              <Input
                id="surgeryFile"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  if (file) {
                    // Validate file type
                    if (!file.name.endsWith('.csv')) {
                      toast.error('Please upload a CSV file')
                      e.target.value = ''
                      return
                    }
                    // Validate file size (max 5MB)
                    const maxSize = 5 * 1024 * 1024
                    if (file.size > maxSize) {
                      toast.error('File size must be less than 5MB')
                      e.target.value = ''
                      return
                    }
                  }
                  setSurgeryFile(file)
                }}
              />
              {surgeryFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {surgeryFile.name} ({(surgeryFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <Button
              onClick={handleScheduleOR}
              disabled={!surgeryFile || scheduleORMutation.isPending}
            >
              {scheduleORMutation.isPending ? 'Scheduling...' : 'Generate OR Schedule'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ER Queue (Prioritized)</CardTitle>
          <CardDescription>Patients sorted by acuity level</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedQueue.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Acuity Level</TableHead>
                  <TableHead>Arrival Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedQueue.map((patient, idx) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-bold">#{idx + 1}</TableCell>
                    <TableCell>{patient.name}</TableCell>
                    <TableCell>{patient.age}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (patient.acuity_level || 0) >= 4
                            ? 'destructive'
                            : (patient.acuity_level || 0) === 3
                            ? 'warning'
                            : 'success'
                        }
                      >
                        Level {patient.acuity_level || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>{patient.arrival_time ? formatDateTime(patient.arrival_time) : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{patient.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No patients in queue
            </div>
          )}
        </CardContent>
      </Card>

      {orSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Operating Room Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(orSchedule) ? (
                orSchedule.map((surgery: any, idx: number) => (
                  <div key={idx} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Surgery {surgery.id || idx + 1}</p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {surgery.duration} minutes
                        </p>
                      </div>
                      <Badge variant="outline">Priority {surgery.priority}</Badge>
                    </div>
                    {surgery.start_time && (
                      <p className="mt-2 text-sm">
                        Scheduled: {formatDateTime(surgery.start_time)}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No OR schedule available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


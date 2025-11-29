import { useState } from 'react'
import { useTriage, useERQueue, useNextPatient, useAddPatient } from '@/hooks'
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
import { Stethoscope, UserPlus, ArrowRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

export function Triage() {
  const [symptoms, setSymptoms] = useState('')
  const [temperature, setTemperature] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [oxygenSat, setOxygenSat] = useState('')
  const [triageResult, setTriageResult] = useState<any>(null)

  const { data: queue, isLoading: queueLoading } = useERQueue()
  const triageMutation = useTriage()
  const nextPatientMutation = useNextPatient()
  const addPatientMutation = useAddPatient()

  const handleTriage = () => {
    // Validation
    if (!symptoms.trim()) {
      toast.error('Please enter at least one symptom')
      return
    }

    const symptomList = symptoms.split(',').map((s) => s.trim()).filter(Boolean)
    if (symptomList.length === 0) {
      toast.error('Please enter valid symptoms')
      return
    }

    // Validate temperature if provided
    if (temperature) {
      const temp = parseFloat(temperature)
      if (isNaN(temp) || temp < 30 || temp > 45) {
        toast.error('Temperature must be between 30-45°C')
        return
      }
    }

    // Validate heart rate if provided
    if (heartRate) {
      const hr = parseInt(heartRate)
      if (isNaN(hr) || hr < 30 || hr > 250) {
        toast.error('Heart rate must be between 30-250 bpm')
        return
      }
    }

    // Validate oxygen saturation if provided
    if (oxygenSat) {
      const o2 = parseFloat(oxygenSat)
      if (isNaN(o2) || o2 < 0 || o2 > 100) {
        toast.error('Oxygen saturation must be between 0-100%')
        return
      }
    }

    // Validate blood pressure format if provided
    if (bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(bloodPressure)) {
      toast.error('Blood pressure must be in format: 120/80')
      return
    }

    const triageData = {
      symptoms: symptomList,
      vitals: {
        ...(temperature && { temperature: parseFloat(temperature) }),
        ...(bloodPressure && { blood_pressure: bloodPressure }),
        ...(heartRate && { heart_rate: parseInt(heartRate) }),
        ...(oxygenSat && { oxygen_saturation: parseFloat(oxygenSat) }),
      },
    }

    triageMutation.mutate(triageData, {
      onSuccess: (data) => {
        setTriageResult(data)
        // Reset form after successful triage
        setSymptoms('')
        setTemperature('')
        setBloodPressure('')
        setHeartRate('')
        setOxygenSat('')
      },
    })
  }

  const handleAddToQueue = () => {
    if (triageResult) {
      addPatientMutation.mutate({
        name: 'New Patient',
        acuity_level: triageResult.acuity_level,
        status: 'waiting',
      })
    }
  }

  const getAcuityColor = (level: number) => {
    if (level >= 4) return 'destructive'
    if (level === 3) return 'warning'
    return 'success'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Triage & Acuity Assessment</h1>
        <p className="text-muted-foreground">Assess patient acuity and manage ER queue</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Patient Assessment
            </CardTitle>
            <CardDescription>Enter patient symptoms and vitals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms (comma-separated)</Label>
              <Input
                id="symptoms"
                placeholder="fever, cough, chest pain"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  placeholder="37.5"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp">Blood Pressure</Label>
                <Input
                  id="bp"
                  placeholder="120/80"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hr">Heart Rate (bpm)</Label>
                <Input
                  id="hr"
                  type="number"
                  placeholder="72"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="o2">O2 Saturation (%)</Label>
                <Input
                  id="o2"
                  type="number"
                  placeholder="98"
                  value={oxygenSat}
                  onChange={(e) => setOxygenSat(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleTriage} disabled={triageMutation.isPending} className="w-full">
              {triageMutation.isPending ? 'Assessing...' : 'Assess Acuity'}
            </Button>
          </CardContent>
        </Card>

        {triageResult && (
          <Card>
            <CardHeader>
              <CardTitle>Assessment Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Acuity Level</p>
                <div className="mt-2">
                  <Badge variant={getAcuityColor(triageResult.acuity_level) as any} className="text-lg px-4 py-2">
                    Level {triageResult.acuity_level}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Explanation</p>
                <p className="mt-2 text-sm">{triageResult.explanation}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recommended Action</p>
                <p className="mt-2 text-sm font-medium">{triageResult.recommended_action}</p>
              </div>
              <Button onClick={handleAddToQueue} className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Add to ER Queue
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ER Queue</CardTitle>
              <CardDescription>Current patients waiting for treatment</CardDescription>
            </div>
            <Button
              onClick={() => nextPatientMutation.mutate()}
              disabled={nextPatientMutation.isPending}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Next Patient
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {queueLoading ? (
            <div className="flex items-center justify-center py-8">Loading queue...</div>
          ) : queue && queue.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Acuity Level</TableHead>
                  <TableHead>Arrival Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>{patient.id}</TableCell>
                    <TableCell>{patient.name}</TableCell>
                    <TableCell>{patient.age}</TableCell>
                    <TableCell>
                      <Badge variant={getAcuityColor(patient.acuity_level || 0) as any}>
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
    </div>
  )
}


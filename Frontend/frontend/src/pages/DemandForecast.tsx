import { useState } from 'react'
import { useForecast, useTrainForecast, useRunForecast } from '@/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Upload, Play, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export function DemandForecast() {
  const [days, setDays] = useState(7)
  const [file, setFile] = useState<File | null>(null)
  const { data: forecast, isLoading } = useForecast(days)
  const trainMutation = useTrainForecast()
  const runMutation = useRunForecast()

  // Ensure forecast is always an array or undefined
  const forecastData = Array.isArray(forecast) ? forecast : undefined

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      e.target.value = '' // Clear the input
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (selectedFile.size > maxSize) {
      toast.error('File size must be less than 10MB')
      e.target.value = '' // Clear the input
      return
    }

    setFile(selectedFile)
  }

  const handleTrain = () => {
    if (!file) {
      toast.error('Please select a CSV file to upload')
      return
    }

    trainMutation.mutate(file, {
      onSuccess: () => {
        setFile(null) // Clear file after successful upload
        // Reset file input
        const fileInput = document.getElementById('file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      },
    })
  }

  const handleRunForecast = () => {
    runMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Demand Forecast</h1>
        <p className="text-muted-foreground">Predict patient admissions using AI forecasting</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Training Data</CardTitle>
            <CardDescription>Upload CSV file with historical patient data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
            <Button onClick={handleTrain} disabled={!file || trainMutation.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              {trainMutation.isPending ? 'Training...' : 'Train Model'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forecast Settings</CardTitle>
            <CardDescription>Configure forecast parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="days">Forecast Days</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>
            <Button onClick={handleRunForecast} disabled={runMutation.isPending}>
              <Play className="mr-2 h-4 w-4" />
              {runMutation.isPending ? 'Running...' : 'Run Forecast'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {days}-Day Forecast
          </CardTitle>
          <CardDescription>Predicted patient admissions with confidence intervals</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">Loading forecast...</div>
          ) : forecastData && forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string | number) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value: string | number) => new Date(value).toLocaleDateString('en-IN')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Predicted"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="upper_bound"
                  stroke="#82ca9d"
                  strokeDasharray="5 5"
                  name="Upper Confidence"
                />
                <Line
                  type="monotone"
                  dataKey="lower_bound"
                  stroke="#ffc658"
                  strokeDasharray="5 5"
                  name="Lower Confidence"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No forecast data available. Run a forecast to see predictions.
            </div>
          )}
        </CardContent>
      </Card>

      {forecastData && forecastData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Forecast Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Average Daily Admissions</p>
                <p className="text-2xl font-bold">
                  {forecastData.length > 0
                    ? (
                        forecastData.reduce((sum, f) => sum + (f.predicted || 0), 0) / forecastData.length
                      ).toFixed(1)
                    : '0.0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Peak Day</p>
                <p className="text-2xl font-bold">
                  {forecastData.length > 0
                    ? new Date(
                        forecastData.reduce((max, f) =>
                          (f.predicted || 0) > (max.predicted || 0) ? f : max
                        , forecastData[0]).date
                      ).toLocaleDateString('en-IN')
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Predicted</p>
                <p className="text-2xl font-bold">
                  {forecastData.reduce((sum, f) => sum + (f.predicted || 0), 0).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


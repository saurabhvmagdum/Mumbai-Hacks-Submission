import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { forecastEndpoints, orchestratorEndpoints } from '@/lib/api/endpoints'
import { handleMutationError, showSuccess } from '@/lib/errorHandler'

export function useForecast(days: number = 7) {
  // Generate default mock data
  const defaultData = Array.from({ length: days }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const base = 50 + Math.random() * 30 + Math.sin(i * 0.5) * 10
    return {
      date: date.toISOString().split('T')[0],
      predicted: Math.round(base),
      upper_bound: Math.round(base * 1.2),
      lower_bound: Math.round(base * 0.8),
    }
  })

  return useQuery({
    queryKey: ['forecast', days],
    queryFn: async () => {
      try {
        const response = await forecastEndpoints.predict(days)
        // Ensure response.data is an array
        if (Array.isArray(response.data) && response.data.length > 0) {
          return response.data
        }
        // If response.data is not an array or is empty, fall through to fallback
        throw new Error('Invalid response format or empty data')
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('Forecast API unavailable, using mock data:', error)
        await new Promise((resolve) => setTimeout(resolve, 500))
        // Always return an array
        return defaultData
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on failure, use fallback immediately
    // Provide a default value to ensure data is never undefined
    placeholderData: defaultData,
    // Ensure data is always defined
    initialData: defaultData,
  })
}

export function useTrainForecast() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return forecastEndpoints.train(formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast'] })
      showSuccess('Training started successfully')
    },
    onError: (error) => {
      handleMutationError(error, 'Failed to start training')
    },
  })
}

export function useRunForecast() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => orchestratorEndpoints.runForecast(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast'] })
      showSuccess('Forecast workflow triggered')
    },
    onError: (error) => {
      handleMutationError(error, 'Failed to trigger forecast')
    },
  })
}


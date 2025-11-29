import { useQuery } from '@tanstack/react-query'
import { mockDischargeAnalysis } from '@/lib/api/mock'
import { dischargeEndpoints } from '@/lib/api/endpoints'

export function useDischargeAnalysis() {
  return useQuery({
    queryKey: ['discharge-analysis'],
    queryFn: async () => {
      try {
        const response = await dischargeEndpoints.analyzeAll()
        // Ensure response.data is an array
        if (Array.isArray(response.data)) {
          return response.data
        }
        // If response.data is not an array, fall through to fallback
        throw new Error('Invalid response format')
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('Discharge API unavailable, using mock data:', error)
        await new Promise((resolve) => setTimeout(resolve, 500))
        return mockDischargeAnalysis
      }
    },
    refetchInterval: 60000,
    retry: false, // Don't retry on failure, use fallback immediately
  })
}

export function useSingleDischargeAnalysis(patientId: string) {
  return useQuery({
    queryKey: ['discharge-analysis', patientId],
    queryFn: () => dischargeEndpoints.analyzeSingle(patientId).then((res) => res.data),
    enabled: !!patientId,
  })
}


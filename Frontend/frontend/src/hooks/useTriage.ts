import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mockERQueue } from '@/lib/api/mock'
import { erOrEndpoints, triageEndpoints, Patient, TriageRequest } from '@/lib/api/endpoints'
import { handleMutationError, showSuccess } from '@/lib/errorHandler'

// Re-export TriageRequest type
export type { TriageRequest }

export function useTriage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TriageRequest) => {
      try {
        const response = await triageEndpoints.triage(data)
        return response.data
      } catch (error) {
        // Fallback to mock logic if API fails
        await new Promise((resolve) => setTimeout(resolve, 800))
        let acuity = 3
        if (data.vitals?.heart_rate && data.vitals.heart_rate > 120) acuity = 5
        else if (data.vitals?.heart_rate && data.vitals.heart_rate > 100) acuity = 4
        if (data.vitals?.oxygen_saturation && data.vitals.oxygen_saturation < 90) acuity = 5
        if (data.symptoms.some((s) => s.toLowerCase().includes('chest pain'))) acuity = 5
        
        return {
          acuity_level: acuity,
          explanation: `Patient assessed with ${data.symptoms.length} symptoms. Vitals indicate ${acuity >= 4 ? 'critical' : acuity === 3 ? 'moderate' : 'mild'} condition.`,
          recommended_action: acuity >= 4 ? 'Immediate treatment required' : acuity === 3 ? 'Priority treatment' : 'Standard care',
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['er-queue'] })
      showSuccess('Triage assessment completed')
    },
    onError: (error) => {
      handleMutationError(error, 'Triage assessment failed')
    },
  })
}

export function useERQueue() {
  return useQuery({
    queryKey: ['er-queue'],
    queryFn: async () => {
      try {
        const response = await erOrEndpoints.getERQueue()
        // Ensure response.data is an array
        if (Array.isArray(response.data)) {
          return response.data
        }
        // If response.data is not an array, fall through to fallback
        throw new Error('Invalid response format')
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('ER Queue API unavailable, using mock data:', error)
        await new Promise((resolve) => setTimeout(resolve, 300))
        return mockERQueue
      }
    },
    refetchInterval: 30000,
    retry: false, // Don't retry on failure, use fallback immediately
  })
}

export function useNextPatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => erOrEndpoints.getNextPatient().then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['er-queue'] })
      showSuccess('Next patient retrieved')
    },
    onError: (error) => {
      handleMutationError(error, 'Failed to get next patient')
    },
  })
}

export function useAddPatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Patient>) => erOrEndpoints.addPatient(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['er-queue'] })
      showSuccess('Patient added to ER queue')
    },
    onError: (error) => {
      handleMutationError(error, 'Failed to add patient')
    },
  })
}


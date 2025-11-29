import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mockStaff } from '@/lib/api/mock'
import { staffEndpoints } from '@/lib/api/endpoints'
import { handleMutationError, showSuccess } from '@/lib/errorHandler'

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      try {
        const response = await staffEndpoints.getStaff()
        // Ensure response.data is an array
        if (Array.isArray(response.data)) {
          return response.data
        }
        // If response.data is not an array, fall through to fallback
        throw new Error('Invalid response format')
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('Staff API unavailable, using mock data:', error)
        await new Promise((resolve) => setTimeout(resolve, 400))
        return mockStaff
      }
    },
    retry: false, // Don't retry on failure, use fallback immediately
  })
}

export function useGenerateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { start_date: string; end_date: string }) =>
      staffEndpoints.generateSchedule(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      showSuccess('Schedule generated successfully')
    },
    onError: (error) => {
      handleMutationError(error, 'Failed to generate schedule')
    },
  })
}

export function useSchedule(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['schedule', startDate, endDate],
    queryFn: async () => {
      try {
        const response = await staffEndpoints.getSchedule(startDate, endDate)
        // Ensure response.data is an array
        if (Array.isArray(response.data)) {
          return response.data
        }
        // If response.data is not an array, fall through to fallback
        throw new Error('Invalid response format')
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('Schedule API unavailable, using mock data:', error)
        await new Promise((resolve) => setTimeout(resolve, 400))
        // Generate mock schedule based on staff and date range
        const mockStaff = await import('@/lib/api/mock').then(m => m.mockStaff)
        const start = new Date(startDate)
        const end = new Date(endDate)
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        
        return mockStaff.slice(0, 3).map((staff) => ({
          staff_id: staff.id,
          shifts: Array.from({ length: Math.min(daysDiff, 7) }, (_, i) => {
            const date = new Date(start)
            date.setDate(date.getDate() + i)
            return {
              date: date.toISOString().split('T')[0],
              start_time: '08:00',
              end_time: '16:00',
            }
          }),
        }))
      }
    },
    enabled: !!startDate && !!endDate,
    retry: false, // Don't retry on failure, use fallback immediately
  })
}


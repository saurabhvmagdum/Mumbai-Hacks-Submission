import { useQuery } from '@tanstack/react-query'
import { mockAgentHealth } from '@/lib/api/mock'
import { orchestratorEndpoints } from '@/lib/api/endpoints'

export function useAgentHealth() {
  return useQuery({
    queryKey: ['agent-health'],
    queryFn: async () => {
      try {
        const response = await orchestratorEndpoints.getAgentHealth()
        // Ensure response.data is an array
        if (Array.isArray(response.data)) {
          return response.data
        }
        // If response.data is not an array, fall through to fallback
        throw new Error('Invalid response format')
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('Agent Health API unavailable, using mock data:', error)
        await new Promise((resolve) => setTimeout(resolve, 500))
        return mockAgentHealth
      }
    },
    refetchInterval: 30000,
    retry: false, // Don't retry on failure, use fallback immediately
  })
}


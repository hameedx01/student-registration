import { useQuery } from '@tanstack/react-query';
import { publicClient } from '../config/publicClient.js';
import { discoverStudentAddresses } from '../utils/studentHistory.js';
import { fetchStudentsMulticall } from '../utils/fetchStudentsMulticall.js';

export function useStudentDirectory(recentAddresses) {
  return useQuery({
    queryKey: ['directory', ...recentAddresses.map((address) => address.toLowerCase()).sort()],
    queryFn: async ({ signal }) => {
      let history;
      try {
        history = await discoverStudentAddresses({ signal });
      } catch (error) {
        signal.throwIfAborted();
        if (!recentAddresses.length) throw error;
        history = { addresses: [], complete: false };
      }
      const result = await fetchStudentsMulticall(
        publicClient,
        [...history.addresses, ...recentAddresses],
        { signal },
      );
      return {
        ...result,
        complete: history.complete && result.failures.length === 0,
        updatedAt: Date.now(),
      };
    },
    refetchInterval: 60_000,
  });
}

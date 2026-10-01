import { useQuery } from '@tanstack/react-query';
import { publicClient } from '../config/publicClient.js';
import { readStudent } from '../utils/readStudent.js';

export const studentKey = (address) => ['student', address?.toLowerCase()];

export function useStudent(address) {
  return useQuery({
    queryKey: studentKey(address),
    queryFn: () => readStudent(publicClient, address),
    enabled: Boolean(address),
  });
}

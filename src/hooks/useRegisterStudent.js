import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWriteContract } from 'wagmi';
import { studentRegistrationAbi } from '../abi/studentRegistrationAbi.js';
import { CHAIN_ID, STUDENT_REGISTRATION_ADDRESS } from '../config/contracts.js';
import { publicClient } from '../config/publicClient.js';
import { studentKey } from './useStudent.js';

export function useRegisterStudent(onRegistered) {
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState('idle');
  const [transaction, setTransaction] = useState(null);

  const mutation = useMutation({
    mutationFn: async ({ address, name, age, course }) => {
      setPhase('checking');
      setTransaction(null);
      const args = [name.trim(), BigInt(age.trim()), course.trim()];
      const request = {
        address: STUDENT_REGISTRATION_ADDRESS,
        abi: studentRegistrationAbi,
        functionName: 'register',
        args,
        account: address,
      };
      await publicClient.simulateContract(request);
      setPhase('wallet');
      const hash = await writeContractAsync({ ...request, chainId: CHAIN_ID });
      setTransaction({ hash, address });
      setPhase('confirming');
      let replacementChangedCall = false;
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 180_000,
        onReplaced: ({ reason, transaction: replacement }) => {
          if (reason !== 'repriced') replacementChangedCall = true;
          setTransaction({ hash: replacement.hash, address });
        },
      });
      if (replacementChangedCall)
        throw new Error('The registration transaction was cancelled or replaced.');
      if (receipt.status !== 'success') throw new Error('The registration transaction reverted.');
      return { registered: true, address, name: args[0], age: args[1].toString(), course: args[2] };
    },
    onSuccess: (student) => {
      setPhase('success');
      // The receipt confirms the exact registration. Refresh against the chain in the background.
      queryClient.setQueryData(studentKey(student.address), student);
      void queryClient.invalidateQueries({ queryKey: studentKey(student.address) });
      void queryClient.invalidateQueries({ queryKey: ['directory'] });
      onRegistered(student.address);
    },
    onError: (_error, variables) => {
      setPhase('error');
      void queryClient.invalidateQueries({ queryKey: studentKey(variables.address) });
    },
  });

  return { ...mutation, phase, transaction };
}

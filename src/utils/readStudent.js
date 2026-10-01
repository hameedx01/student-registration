import { studentRegistrationAbi } from '../abi/studentRegistrationAbi.js';
import { STUDENT_REGISTRATION_ADDRESS } from '../config/contracts.js';

export async function readStudent(client, address, blockNumber) {
  const config = {
    address: STUDENT_REGISTRATION_ADDRESS,
    abi: studentRegistrationAbi,
    blockNumber,
  };
  const registered = await client.readContract({
    ...config,
    functionName: 'registered',
    args: [address],
  });
  if (!registered) return { registered: false, address };
  const [name, age, course] = await client.readContract({
    ...config,
    functionName: 'getStudent',
    args: [address],
  });
  return { registered: true, address, name, age: age.toString(), course };
}

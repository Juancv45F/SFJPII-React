import { Redirect } from 'expo-router';
import { homeFor } from '../config/roles';
import { useSession } from '../state/app';

export default function Index() {
  const { role, isAuthenticated } = useSession();
  return <Redirect href={homeFor(role, isAuthenticated) as any} />;
}

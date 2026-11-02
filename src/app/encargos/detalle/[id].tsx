import { useLocalSearchParams } from 'expo-router';
import { EncargosView } from '../../../components/EncargosView';
import { Guard } from '../../../components/Screen';

export default function EncargoDetallePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Guard roles={['cliente', 'admin', 'editor', 'super_admin']}><EncargosView detailId={id} /></Guard>;
}

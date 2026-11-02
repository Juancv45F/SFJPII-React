import { EncargosView } from '../../components/EncargosView';
import { Guard } from '../../components/Screen';

export default function AdminEncargosPage() {
  return <Guard roles={['admin', 'editor', 'super_admin']}><EncargosView /></Guard>;
}

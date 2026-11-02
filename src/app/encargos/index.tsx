import { EncargosView } from '../../components/EncargosView';
import { Guard } from '../../components/Screen';

export default function EncargosPage() {
  return <Guard roles={['cliente']}><EncargosView /></Guard>;
}

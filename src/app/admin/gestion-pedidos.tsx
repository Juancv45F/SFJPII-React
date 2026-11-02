import { AdminOrders } from '../../components/AdminOrders';
import { Guard } from '../../components/Screen';
import { STAFF_ROLES } from '../../config/roles';

export default function GestionPedidosPage() {
  return <Guard roles={STAFF_ROLES}><AdminOrders mode="gestion" /></Guard>;
}

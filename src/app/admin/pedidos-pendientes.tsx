import { AdminOrders } from '../../components/AdminOrders';
import { Guard } from '../../components/Screen';
import { STAFF_ROLES } from '../../config/roles';

export default function PedidosPendientesPage() {
  return <Guard roles={STAFF_ROLES}><AdminOrders mode="pendientes" /></Guard>;
}

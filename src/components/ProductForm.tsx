import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HostInstance, Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getAllProducts, getCategorias, postProducto, putProducto } from '../services/products';
import { useTheme } from '../theme/ThemeProvider';
import { showToast } from '../ui/overlays';
import { Button, Field, Icon, Notice, Select } from './ui';
import { AppDialog } from './AppDialog';
import { rgba } from '../theme/colors';
import { body, heading, radius, space } from '../theme/tokens';
import { useFileDrop } from '../hooks/useFileDrop';

type Props = { open: boolean; producto?: any; exclusivoEncargo?: boolean; onClose: (refresh: boolean) => void };
// `file` existe solo en web: FormData del navegador necesita un Blob, no { uri, name, type }.
type Picked = { uri: string; name: string; type: string; file?: Blob };

const NEW = 'NEW';

// Port de ProductFormComponent (modal de alta/edición de productos).
export function ProductForm({ open, producto, exclusivoEncargo = false, onClose }: Props) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const soloEncargo = exclusivoEncargo || !!producto?.solo_encargo;
  const [categorias, setCategorias] = useState<any[]>([]);
  const [productosBase, setProductosBase] = useState<any[]>([]);
  const [form, setForm] = useState({
    nombre: '', precio: '', descuento: '', stock: '', categoriaId: '', categoriaNombre: '', categoriaDescripcion: '',
    descripcion: '', imagen: '', productoBaseId: '', unidadesPorVenta: '1',
  });
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevaCategoriaDescripcion, setNuevaCategoriaDescripcion] = useState('');
  const [showNueva, setShowNueva] = useState(false);
  const [file, setFile] = useState<Picked | null>(null);
  const [saving, setSaving] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) resetForm();
  }

  function resetForm() {
    setFile(null);
    setShowNueva(false);
    setNuevaCategoria('');
    setNuevaCategoriaDescripcion('');
    setForm({
      nombre: producto?.nombre || '',
      precio: producto ? String(producto.precio ?? 0) : '',
      descuento: producto ? String(producto.descuento ?? 0) : '',
      stock: producto ? String(producto.stock ?? 0) : '',
      categoriaId: producto?.categoriaId || producto?.categoria?._id || '',
      categoriaNombre: producto?.categoria?.nombre || '',
      categoriaDescripcion: producto?.categoria?.descripcion || '',
      descripcion: producto?.descripcion || '',
      imagen: producto?.imagen || '',
      productoBaseId: String(producto?.producto_base?._id || producto?.producto_base || ''),
      unidadesPorVenta: String(producto?.unidades_por_venta || 1),
    });
  }

  useEffect(() => {
    if (!open) return;
    getCategorias().then((r: any) => setCategorias(r?.data || [])).catch(() => {});
    if (!soloEncargo) {
      const currentId = String(producto?.id || producto?._id || '');
      getAllProducts().then((r: any) => setProductosBase((r?.data || []).filter((p: any) =>
        !p.solo_encargo && !p.producto_base && String(p.id || p._id) !== currentId))).catch(() => {});
    }
  }, [open, producto, soloEncargo]);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const esPromocion = !!form.productoBaseId;
  const stockPromocion = useMemo(() => {
    const base = productosBase.find(p => String(p.id || p._id) === form.productoBaseId);
    const unidades = Number(form.unidadesPorVenta);
    return base && Number.isInteger(unidades) && unidades >= 2 ? Math.floor(Number(base.stock || 0) / unidades) : 0;
  }, [productosBase, form.productoBaseId, form.unidadesPorVenta]);

  const onCategoriaChange = (value: string) => {
    if (value === NEW) {
      setShowNueva(true);
      setForm(f => ({ ...f, categoriaId: '', categoriaNombre: '', categoriaDescripcion: '' }));
      return;
    }
    setShowNueva(false);
    const cat = categorias.find(c => c.nombre === value);
    setForm(f => ({ ...f, categoriaId: cat?._id || cat?.id || '', categoriaNombre: value, categoriaDescripcion: cat?.descripcion || '' }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    const type = a.mimeType || 'image/jpeg';
    if (!type.startsWith('image/')) return;
    setFile({ uri: a.uri, type, name: a.fileName || `producto.${type.split('/')[1] || 'jpg'}`, file: a.file });
  };

  const onDropFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return showToast('Solo se permiten imágenes', 'warning');
    setFile(prev => {
      if (prev?.uri.startsWith('blob:')) URL.revokeObjectURL(prev.uri);
      return { uri: URL.createObjectURL(f), name: f.name, type: f.type, file: f };
    });
  }, []);
  const dropRef = useRef<HostInstance>(null);
  const dragging = useFileDrop(dropRef, onDropFile, open);

  const valid = !!form.nombre.trim() && (!showNueva || !!nuevaCategoria.trim()) && (!esPromocion || Number(form.unidadesPorVenta) >= 2);

  const guardar = async () => {
    if (!valid || saving) return;
    const data = new FormData();
    data.append('nombre', form.nombre);
    data.append('precio', String(Number(form.precio) || 0));
    data.append('descuento', String(Number(form.descuento) || 0));
    data.append('solo_encargo', String(soloEncargo));
    data.append('stock', soloEncargo ? '0' : String(esPromocion ? stockPromocion : Number(form.stock) || 0));
    data.append('producto_base', soloEncargo ? '' : form.productoBaseId);
    data.append('unidades_por_venta', soloEncargo ? '1' : String(Number(form.unidadesPorVenta) || 1));
    const idFinal = showNueva ? '' : form.categoriaId;
    if (idFinal) data.append('categoriaId', idFinal);
    data.append('categoria', JSON.stringify({
      nombre: showNueva ? nuevaCategoria : form.categoriaNombre,
      descripcion: showNueva ? nuevaCategoriaDescripcion : form.categoriaDescripcion,
      activa: true,
    }));
    data.append('descripcion', form.descripcion);
    if (file) {
      if (file.file) data.append('imagen', file.file, file.name);
      else data.append('imagen', file as any);
    }
    setSaving(true);
    try {
      if (producto) await putProducto(producto.id, data);
      else await postProducto(data);
      showToast(`Producto ${producto ? 'actualizado' : 'creado'} con éxito`, 'success', 2000);
      onClose(true);
    } catch (err: any) {
      showToast(err?.error?.message || 'Error al guardar el producto', 'danger', 2000);
    } finally {
      setSaving(false);
    }
  };

  const preview = file?.uri || form.imagen;
  const twoCols = width >= 900 && height >= 560;
  const title = `${producto ? 'Editar' : 'Nuevo'} producto${soloEncargo ? ' por encargo' : ''}`;

  return (
    <AppDialog
      open={open}
      onClose={() => onClose(false)}
      title={title}
      footer={(
        <>
          <Button fill="clear" onPress={() => onClose(false)}>Cancelar</Button>
          <Button onPress={guardar} disabled={!valid || saving} loading={saving} icon={producto ? 'save-outline' : 'add-circle-outline'}
            style={{ paddingHorizontal: 24, minHeight: 48 }}>
            {producto ? 'Guardar cambios' : 'Registrar producto'}
          </Button>
        </>
      )}
    >
      <View style={[styles.form, twoCols && { flexDirection: 'row', alignItems: 'flex-start' }]}>
        <View style={twoCols ? { width: 340 } : null}>
          <Pressable ref={dropRef} onPress={pickImage} accessibilityRole="button" accessibilityLabel={preview ? 'Cambiar imagen del producto' : 'Subir imagen del producto'}
            style={({ hovered }: any) => [styles.drop, pointer, { backgroundColor: preview ? colors.photoBg : colors.surface2, borderColor: hovered ? colors.primary : colors.border },
              twoCols ? { aspectRatio: 1 } : { height: 200 },
              dragging && { borderColor: colors.success, borderStyle: 'solid', borderWidth: 3, backgroundColor: rgba(colors.successRgb, 0.1) }]}>
            {preview ? (
              <>
                <Image source={{ uri: preview }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} accessibilityLabel="Vista previa" />
                <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
                  <Icon name="camera-outline" size={18} color="#FFFFFF" />
                  <Text style={[body(600), { color: '#FFFFFF', fontSize: 14 }]}>Cambiar imagen</Text>
                </View>
              </>
            ) : (
              <>
                <Icon name="cloud-upload-outline" size={44} color={dragging ? colors.success : colors.primary} />
                <Text style={[heading(700), { color: colors.text, fontSize: 16, marginTop: 10 }]}>Sube la foto del producto</Text>
                <Text style={[body(400), { color: colors.muted, fontSize: 14, textAlign: 'center', paddingHorizontal: 20, marginTop: 4 }]}>
                  {Platform.OS === 'web' ? 'Haz clic o arrastra la imagen aquí' : 'Toca para seleccionar una imagen'}
                </Text>
              </>
            )}
          </Pressable>
          <Text style={[body(400), { color: colors.muted, fontSize: 13.5, marginTop: 8 }]}>JPG, PNG o WebP. Se muestra sobre fondo blanco en el catálogo.</Text>
        </View>

        <View style={{ flex: 1, gap: space[5], width: twoCols ? undefined : '100%' }}>
          <View role="group" aria-label="Datos del producto">
            <Text style={[styles.legend, { color: colors.text }]}>Datos del producto</Text>
            <Field label="Nombre del producto" value={form.nombre} onChangeText={set('nombre')} placeholder="Ej. Paracetamol 500 mg" />
            <Select label="Categoría" value={showNueva ? NEW : form.categoriaNombre} placeholder="Selecciona una" onChange={onCategoriaChange}
              options={[...categorias.map(c => ({ value: String(c.nombre), label: String(c.nombre) })), { value: NEW, label: '+ Nueva categoría...' }]} />
            {showNueva ? (
              <>
                <Field label="Nombre de la nueva categoría" value={nuevaCategoria} onChangeText={setNuevaCategoria} placeholder="Ej. Accesorios" />
                <Field label="Descripción de la nueva categoría" value={nuevaCategoriaDescripcion} onChangeText={setNuevaCategoriaDescripcion}
                  placeholder="Describe brevemente la categoría..." multiline />
              </>
            ) : null}
            <Field label="Descripción breve" value={form.descripcion} onChangeText={set('descripcion')} placeholder="Presentación, uso o detalles del producto..." multiline />
          </View>

          <View role="group" aria-label="Precio e inventario">
            <Text style={[styles.legend, { color: colors.text }]}>Precio e inventario</Text>
            <View style={[styles.row, width < 480 && { flexDirection: 'column', gap: 0 }]}>
              <Field label="Precio ($)" value={form.precio} onChangeText={set('precio')} keyboardType="decimal-pad" placeholder="0.00" containerStyle={{ flex: 1 }} />
              <Field label="Descuento (%)" value={form.descuento} onChangeText={set('descuento')} keyboardType="number-pad" placeholder="0" containerStyle={{ flex: 1 }} />
              {!soloEncargo && !esPromocion ? (
                <Field label="Stock inicial" value={form.stock} onChangeText={set('stock')} keyboardType="number-pad" placeholder="0" containerStyle={{ flex: 1 }} />
              ) : null}
            </View>
            {!soloEncargo ? (
              <>
                <Select label="Producto base de la promoción (opcional)" value={form.productoBaseId} placeholder="Producto normal, sin vínculo"
                  onChange={set('productoBaseId')}
                  options={[{ value: '', label: 'Producto normal, sin vínculo' },
                    ...productosBase.map(b => ({ value: String(b.id || b._id), label: `${b.nombre} — ${b.stock} unidades` }))]} />
                {esPromocion ? (
                  <>
                    <Field label="Unidades que consume cada promoción" value={form.unidadesPorVenta} onChangeText={set('unidadesPorVenta')}
                      keyboardType="number-pad" hint="Mínimo 2 unidades." />
                    <Notice tone="info" icon="information-circle">
                      {`Disponibles: ${stockPromocion} promociones. Cada venta descontará ${form.unidadesPorVenta} unidades del producto base.`}
                    </Notice>
                  </>
                ) : null}
              </>
            ) : (
              <Notice tone="info" icon="information-circle">Exclusivo por encargo: no se almacena inventario y solo aparece en Por encargo.</Notice>
            )}
          </View>
        </View>
      </View>
    </AppDialog>
  );
}

const pointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const styles = StyleSheet.create({
  form: { padding: space[5], gap: space[6] },
  legend: { ...heading(700), fontSize: 17, marginBottom: space[3] },
  row: { flexDirection: 'row', gap: space[3] },
  drop: { width: '100%', borderWidth: 2, borderStyle: 'dashed', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: space[3] },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, gap: 8 },
});

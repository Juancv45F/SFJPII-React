type Listener<T> = (value: T) => void;

// Sustituto ligero de Subject/BehaviorSubject de RxJS.
export class Emitter<T = void> {
  private listeners = new Set<Listener<T>>();
  emit(value: T) {
    [...this.listeners].forEach(listener => listener(value));
  }
  subscribe(listener: Listener<T>) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

export class Store<T> extends Emitter<T> {
  constructor(private current: T) { super(); }
  get value() { return this.current; }
  set(next: T) {
    this.current = next;
    this.emit(next);
  }
}

type Listener = () => void;

let listeners: Listener[] = [];

export const drawerEvent = {
  listen(fn: Listener) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },
  emit() {
    listeners.forEach((fn) => fn());
  },
};

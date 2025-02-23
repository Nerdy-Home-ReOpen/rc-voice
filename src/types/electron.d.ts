declare global {
  interface Window {
    require: (module: string) => any;
  }
}

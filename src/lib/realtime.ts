export function createRealtimeChannelName(base: string) {
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

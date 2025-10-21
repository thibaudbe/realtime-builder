import { create } from 'zustand'

export type ProviderStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

interface State {
  status: ProviderStatus
  setStatus: (s: ProviderStatus) => void
}

export const useProviderStatus = create<State>((set) => ({
  status: 'connecting',
  setStatus: (s: ProviderStatus) => set({ status: s }),
}))

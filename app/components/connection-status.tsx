'use client'

import { useState } from 'react'

import { connect, disconnect } from '../lib/store'
import { useProviderStatus } from '../store/use-provider-status.store'

const statusColors = {
  connected: '#4CAF50', // Vert
  disconnected: '#F44336', // Rouge
  connecting: '#FFC107', // Jaune
  error: '#9E9E9E', // Gris
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export function ConnectionStatus() {
  const [online, setOnline] = useState(true)

  const status = useProviderStatus((s) => s.status)

  return (
    <div
      style={{
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div>
        <label style={{ marginRight: 12 }}>
          <input
            type="radio"
            name="connectivity"
            checked={online === true}
            onChange={() => {
              setOnline(true)
              connect()
            }}
          />
          Online (enable sync)
        </label>
        <label>
          <input
            type="radio"
            name="connectivity"
            checked={online === false}
            onChange={() => {
              setOnline(false)
              disconnect()
            }}
          />
          Offline (disable sync)
        </label>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: statusColors[status],
            transition: 'background-color 0.3s',
          }}
          title={status}
        />
        <span style={{ textTransform: 'capitalize' }}>{status}</span>
      </div>
    </div>
  )
}

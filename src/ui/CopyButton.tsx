'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './kit'

export function CopyButton({ text, label = 'Copy', disabled }: { text: string; label?: string; disabled?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      size="sm"
      tone="ghost"
      disabled={disabled || !text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* clipboard blocked; the text is still selectable */
        }
      }}
    >
      {done ? <Check size={15} /> : <Copy size={15} />}
      {done ? 'Copied' : label}
    </Button>
  )
}

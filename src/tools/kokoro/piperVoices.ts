/**
 * Hindi-native Piper voices from rhasspy/piper-voices.
 * LICENSE: Priyamvada and Pratham are trained on CC BY-NC-SA 4.0 data; Rohan on
 * IIT Madras IndicTTS data. Treat all three as non-commercial use only.
 */
export interface PiperVoice {
  id: string
  name: string
  gender: 'Female' | 'Male'
  /** Path inside rhasspy/piper-voices, without extension. */
  path: string
}

export const PIPER_VOICES: PiperVoice[] = [
  { id: 'piper:priyamvada', name: 'Priyamvada', gender: 'Female', path: 'hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium' },
  { id: 'piper:pratham', name: 'Pratham', gender: 'Male', path: 'hi/hi_IN/pratham/medium/hi_IN-pratham-medium' },
  { id: 'piper:rohan', name: 'Rohan', gender: 'Male', path: 'hi/hi_IN/rohan/medium/hi_IN-rohan-medium' },
]

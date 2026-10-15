declare module 'piper-phonemize' {
  interface PhonemizeModule {
    callMain(args: string[]): void
  }
  export function createPiperPhonemize(options: {
    print: (line: string) => void
    printErr: (line: string) => void
    locateFile: (path: string) => string
  }): Promise<PhonemizeModule>
}

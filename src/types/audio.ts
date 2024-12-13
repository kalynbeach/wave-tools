export type AudioFormat = 'mp3' | 'wav';

export type AudioSource = {
  type: 'file' | 'stream';
  format: AudioFormat;
  source: string | ReadableStream;
};

export type AudioMetadata = {
  duration: number;
  sampleRate: number;
  channels: number;
  format: AudioFormat;
  bitRate?: number;
};

export type DecodedAudio = {
  buffer: Float32Array[];  // Array of channels
  metadata: AudioMetadata;
};

export interface IAudioLoader {
  load(source: AudioSource): Promise<DecodedAudio>;
  supports(format: AudioFormat): boolean;
}

export class AudioLoadError extends Error {
  constructor(
    message: string,
    public readonly code: 'FORMAT_ERROR' | 'DECODE_ERROR' | 'READ_ERROR',
    public readonly source?: unknown
  ) {
    super(message);
    this.name = 'AudioLoadError';
  }
}
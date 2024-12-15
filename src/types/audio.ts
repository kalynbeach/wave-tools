import type {
  TempoData,
  BeatData,
  TimeSignatureData,
  KeyData,
  PitchData,
  SpectralData,
} from './music';

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
  bitRate: number;
  encoding?: string;
  tags?: Record<string, string>;
};

export type DecodedAudio = {
  buffer: Float32Array[];  // Array of channels
  metadata: AudioMetadata;
};

export interface ProcessedAudioData {
  metadata: AudioMetadata;
  features: {
    temporal: {
      tempo: TempoData;
      beats: BeatData;
      timeSignature: TimeSignatureData;
      rhythm?: {            // Optional rhythm analysis
        syncopation: number;
        complexity: number;
        density: number;
      };
    };
    tonal: {
      key: KeyData;
      pitch: PitchData;
      harmony?: {          // Optional harmonic analysis
        progressions: string[];
        complexity: number;
        tension: number[];
      };
    };
    spectral: SpectralData;
    dynamics?: {           // Optional dynamic analysis
      loudness: number[];  // Loudness values over time
      dynamics: number[];  // Dynamic range values
      crest: number[];     // Crest factors
    };
  };
  confidence: {
    overall: number;       // Overall analysis confidence [0-1]
    featureSpecific: Record<string, number>; // Per-feature confidence scores
  };
  analysis: {
    timestamp: string;     // ISO timestamp of analysis
    version: string;       // Analysis software version
    processingTime: number; // Processing time in seconds
    parameters?: {         // Optional processing parameters
      windowSize: number;
      hopSize: number;
      algorithm: string;
      settings: Record<string, unknown>;
    };
  };
}

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
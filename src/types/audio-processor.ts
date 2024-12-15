import type {
  AudioSource,
  AudioFormat,
  AudioMetadata,
  DecodedAudio,
} from './audio';
import type {
  TempoData,
  BeatData,
  TimeSignatureData,
  KeyData,
  PitchData,
  SpectralData,
} from './music';

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

export interface AudioProcessorOptions {
  /** Sample rate for analysis (default: 44100) */
  sampleRate?: number;
  
  /** Window size for FFT analysis (default: 2048) */
  windowSize?: number;
  
  /** Hop size between analysis frames (default: 512) */
  hopSize?: number;
  
  /** Maximum audio duration in seconds (default: no limit) */
  maxDuration?: number;
  
  /** Maximum file size in bytes (default: no limit) */
  maxFileSize?: number;
  
  /** Features to extract (default: all) */
  features?: {
    temporal?: boolean | {
      tempo?: boolean;
      beats?: boolean;
      timeSignature?: boolean;
      rhythm?: boolean;
    };
    tonal?: boolean | {
      key?: boolean;
      pitch?: boolean;
      harmony?: boolean;
    };
    spectral?: boolean | {
      basic?: boolean;
      mfcc?: boolean;
      chroma?: boolean;
    };
    dynamics?: boolean;
  };
  
  /** Buffer configuration for streaming */
  buffer?: {
    chunkSize?: number;
    maxBufferSize?: number;
  };
  
  /** Progress callback configuration */
  progress?: {
    /** Enable detailed progress reporting */
    enabled?: boolean;
    /** Minimum time between progress updates in ms */
    updateInterval?: number;
  };
}

export interface ProcessingProgress {
  /** Current processing stage */
  stage: 'loading' | 'decoding' | 'analyzing' | 'finalizing';
  /** Progress percentage (0-100) */
  progress: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Current feature being processed */
  currentFeature?: string;
  /** Bytes processed (for streaming) */
  bytesProcessed?: number;
  /** Total bytes (if known) */
  totalBytes?: number;
}

export interface ProcessingResult {
  /** Processed audio data */
  data: ProcessedAudioData;
  /** Processing statistics */
  stats: {
    /** Total processing time in seconds */
    processingTime: number;
    /** Time spent in each stage */
    timings: {
      loading: number;
      decoding: number;
      analyzing: number;
      finalizing: number;
    };
    /** Memory usage statistics */
    memory: {
      peak: number;
      final: number;
    };
  };
}

export interface IAudioProcessor {
  /**
   * Process an audio source and extract features
   * @param source Audio source to process
   * @param options Processing options
   */
  process(
    source: AudioSource,
    options?: AudioProcessorOptions
  ): Promise<ProcessingResult>;
  
  /**
   * Process an audio stream in real-time
   * @param stream Audio stream to process
   * @param options Processing options
   */
  processStream(
    stream: ReadableStream,
    options?: AudioProcessorOptions
  ): AsyncGenerator<ProcessedAudioData, void, unknown>;
  
  /**
   * Update processing options
   * @param options New options to apply
   */
  configure(options: Partial<AudioProcessorOptions>): void;
  
  /**
   * Register a progress callback
   * @param callback Function to call with progress updates
   */
  onProgress(callback: (progress: ProcessingProgress) => void): void;
  
  /**
   * Cancel ongoing processing
   */
  cancel(): void;
  
  /**
   * Check if a given audio format is supported
   * @param format Format to check
   */
  supportsFormat(format: AudioFormat): boolean;
  
  /**
   * Get the list of supported audio formats
   */
  getSupportedFormats(): AudioFormat[];
  
  /**
   * Get current processor configuration
   */
  getConfiguration(): AudioProcessorOptions;
  
  /**
   * Preload and cache analysis models/data
   */
  preload(): Promise<void>;
  
  /**
   * Clean up resources and cached data
   */
  dispose(): Promise<void>;
  
  /**
   * Process already decoded audio data
   * @param audio Decoded audio data
   * @param options Processing options
   */
  processDecoded(
    audio: DecodedAudio,
    options?: AudioProcessorOptions
  ): Promise<ProcessingResult>;
  
  /**
   * Get a specific feature extractor instance
   * @param featureType Type of feature extractor to get
   */
  getExtractor<T extends keyof ProcessedAudioData['features']>(
    featureType: T
  ): IFeatureExtractor<T>;
}

export interface IFeatureExtractor<T extends keyof ProcessedAudioData['features']> {
  /**
   * Extract features from decoded audio
   * @param audio Decoded audio data
   * @param options Extraction options
   */
  extract(
    audio: DecodedAudio,
    options?: AudioProcessorOptions
  ): Promise<ProcessedAudioData['features'][T]>;
  
  /**
   * Configure the feature extractor
   * @param options Extractor-specific options
   */
  configure(options: unknown): void;
  
  /**
   * Get extractor-specific capabilities
   */
  getCapabilities(): unknown;
}
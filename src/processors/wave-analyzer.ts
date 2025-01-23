import type { MeydaAnalyzer } from 'meyda/dist/esm/meyda-wa';
import Meyda, { type MeydaAudioFeature, type MeydaFeaturesObject } from 'meyda';
import type { IWaveAnalyzer, WaveAnalyzerOptions, WaveAnalyzerData, WaveAnalyzerCallback, WaveAnalyzerResult } from '../types/wave-analyzer';
import type { DecodedAudio } from '../types/audio';

export function createWaveAnalyzerOptions(): WaveAnalyzerOptions {
  return {
    features: ['rms', 'loudness', 'chroma'],
    sampleRate: 48000,
    bufferSize: 2048,
  };
}

export function createWaveAnalyzer(
  audio: ArrayBuffer,
  options?: WaveAnalyzerOptions,
  callback?: WaveAnalyzerCallback
): IWaveAnalyzer {
  if (!options) {
    options = createWaveAnalyzerOptions();
  }
  return new WaveAnalyzer(audio, options, callback);
}

export class WaveAnalyzer implements IWaveAnalyzer {
  audio: ArrayBuffer;
  options: WaveAnalyzerOptions;
  meyda: Meyda;
  data: WaveAnalyzerData = {};
  callback?: WaveAnalyzerCallback;

  constructor(audio: ArrayBuffer, options: WaveAnalyzerOptions, callback?: WaveAnalyzerCallback) {
    this.audio = audio;
    this.options = options;
    this.meyda = Meyda;
    this.callback = callback;
    // this.analyzer = this.createAnalyzer();
  }

  analyze(features?: MeydaAudioFeature[]): WaveAnalyzerResult {
    const featuresToExtract = features || this.options.features;

    const signal = new Float32Array(this.audio);
    console.log('[WaveAnalyzer] signal.byteLength: ', signal.byteLength);

    // TODO: ensure audio ArrayBuffer size is a power of 2

    // this.meyda.bufferSize = signal.byteLength;
    // this.meyda.bufferSize = this.options.bufferSize;
    // Properly set Meyda buffer size
    // this.meyda.bufferSize = this.options.bufferSize;

    console.log('[WaveAnalyzer] this.meyda.bufferSize: ', this.meyda.bufferSize);

    const data: WaveAnalyzerData | null = this.meyda.extract(featuresToExtract, signal);

    if (!data) {
      throw new Error('[WaveAnalyzer] Meyda extraction failed');
    }

    this.data = data;

    return {
      data: this.data,
      timestamp: new Date().toISOString(),
    };
  }

  // createAnalyzer(): MeydaAnalyzer {
  //   try {
  //     return Meyda.createMeydaAnalyzer({
  //       audioContext: this.context,
  //       source: this.source,
  //       featureExtractors: this.options.features,
  //       callback: (data: MeydaFeaturesObject) => {
  //         this.data = data;
  //         if (this.callback) {
  //           this.callback(data);
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     console.error('[WaveAnalyzer] Error creating Meyda analyzer:', error);
  //     throw error;
  //   }
  // }

  // startAnalyzer(features?: MeydaAudioFeature[]): void {
  //   if (features) {
  //     this.analyzer.start(features);
  //   } else {
  //     this.analyzer.start();
  //   }
  // }

  // stopAnalyzer(): void {
  //   this.analyzer.stop();
  // }
}
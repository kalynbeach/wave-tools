import Meyda, { type MeydaAudioFeature, type MeydaFeaturesObject } from 'meyda';
import type { IWaveAnalyzer, WaveAnalyzerOptions, WaveAnalyzerData, WaveAnalyzerCallback, WaveAnalyzerResult } from '../types/wave-analyzer';

export function createWaveAnalyzerOptions(): WaveAnalyzerOptions {
  return {
    features: ['rms', 'loudness', 'chroma'],
    sampleRate: 48000,
    bufferSize: 2048,
  };
}

export function createWaveAnalyzer(
  audio: ArrayBufferLike,
  options?: WaveAnalyzerOptions,
  callback?: WaveAnalyzerCallback
): IWaveAnalyzer {
  if (!options) {
    options = createWaveAnalyzerOptions();
  }
  return new WaveAnalyzer(audio, options, callback);
}

export class WaveAnalyzer implements IWaveAnalyzer {
  audio: ArrayBufferLike;
  options: WaveAnalyzerOptions;
  meyda: Meyda;
  data: WaveAnalyzerData = {};
  callback?: WaveAnalyzerCallback;

  constructor(audio: ArrayBufferLike, options: WaveAnalyzerOptions, callback?: WaveAnalyzerCallback) {
    this.audio = audio;
    this.options = options;
    this.meyda = Meyda;
    this.callback = callback;
  }

  analyze(features?: MeydaAudioFeature[]): WaveAnalyzerResult {
    const featuresToExtract = features || this.options.features;

    let signal = new Float32Array(this.audio);
    
    // ensure the buffer size is a power of 2 as required by Meyda
    const bufferSize = this.options.bufferSize;
    if (signal.length > bufferSize) {
      signal = signal.subarray(0, bufferSize);
    } else if (signal.length < bufferSize) {
      // zero-pad if signal is too short
      const paddedSignal = new Float32Array(bufferSize);
      paddedSignal.set(signal);
      signal = paddedSignal;
    }

    this.meyda.bufferSize = bufferSize;

    const data = this.meyda.extract(featuresToExtract, signal);

    if (!data) {
      throw new Error('[WaveAnalyzer] Meyda extraction failed');
    }

    this.data = data;

    return {
      data: this.data,
      timestamp: new Date().toISOString(),
    };
  }
}
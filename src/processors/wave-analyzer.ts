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
  }

  analyze(features?: MeydaAudioFeature[]): WaveAnalyzerResult {
    const featuresToExtract = features || this.options.features;

    let signal = new Float32Array(this.audio);
    console.log('[WaveAnalyzer] signal.byteLength: ', signal.byteLength);

    // TODO?: if signal.byteSize is greater than this.options.bufferSize, resample to this.options.bufferSize
    // TODO?: ensure signal.byteSize is a power of 2
    if (signal.byteLength > this.options.bufferSize) {
      const newSignal = new Float32Array(this.options.bufferSize);
      newSignal.set(signal.subarray(0, this.options.bufferSize));
      console.log('[WaveAnalyzer] newSignal.byteLength: ', newSignal.byteLength);
      signal = newSignal;
    }

    // this.meyda.bufferSize = this.options.bufferSize;
    this.meyda.bufferSize = signal.byteLength;
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
}
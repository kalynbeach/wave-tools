import type { MeydaAudioFeature, MeydaFeaturesObject } from 'meyda';
import type Meyda from 'meyda';

export type WaveAnalyzerOptions = {
  features: MeydaAudioFeature[];
  sampleRate: number;
  bufferSize: number;
}

export type WaveAnalyzerData = Partial<MeydaFeaturesObject>;

export type WaveAnalyzerCallback = (data: MeydaFeaturesObject) => void;

export interface WaveAnalyzerResult {
  data: WaveAnalyzerData;
  timestamp: string;
}

export interface IWaveAnalyzer {
  audio: ArrayBufferLike;
  options: WaveAnalyzerOptions;
  meyda: Meyda;
  data: WaveAnalyzerData;
  callback?: WaveAnalyzerCallback;

  analyze(features?: MeydaAudioFeature[]): WaveAnalyzerResult;
}
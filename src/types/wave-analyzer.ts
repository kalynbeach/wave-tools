import type { MeydaAnalyzer } from 'meyda/dist/esm/meyda-wa';
import type { MeydaAudioFeature, MeydaFeaturesObject } from 'meyda';
import Meyda from 'meyda';
import type { DecodedAudio } from './audio';

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
  // context: AudioContext;
  // source: AudioBufferSourceNode;
  // analyzer: MeydaAnalyzer;
  audio: ArrayBuffer;
  options: WaveAnalyzerOptions;
  meyda: Meyda;
  data: WaveAnalyzerData;
  callback?: WaveAnalyzerCallback;

  analyze(features?: MeydaAudioFeature[]): WaveAnalyzerResult;
  // createAnalyzer(): void;
  // startAnalyzer(features?: MeydaAudioFeature[]): void;
  // stopAnalyzer(): void;
}
import type { AudioFormat, AudioSource, DecodedAudio } from './types/audio';
import { AudioLoader } from './loaders';
import { createWaveAnalyzer } from './processors/wave-analyzer';

export async function analyzeAudioFile(source: AudioSource) {
  const { decodedAudio, audioFile, audioArrayBuffer, audioData } = await initializeAudio(source);

  // console.log('[analyzeAudioFile] decodedAudio.buffer: ', decodedAudio.buffer[0]);
  // console.log('[analyzeAudioFile] audioArrayBuffer: ', audioArrayBuffer);
  // console.log('[analyzeAudioFile] audioData: ', audioData);

  const waveAnalyzer = createWaveAnalyzer(audioArrayBuffer);

  console.log('[analyzeAudioFile] analyzing...');
  const result = waveAnalyzer.analyze();

  console.log('[analyzeAudioFile] done!');
  console.log('[analyzeAudioFile] WaveAnalyzerResult: ', result);
}

export async function initializeAudio(source: AudioSource) {
  console.log('[initializeAudio] initializing audio...');

  const loader = new AudioLoader();
  const decodedAudio = await loader.load(source);
  console.log('[initializeAudio] metadata: ', decodedAudio.metadata);

  // TODO: figure this stuff out (what data type / transforms are needed?)
  const audioFile = Bun.file(source.source as string);
  const audioArrayBuffer = await audioFile.arrayBuffer();
  const audioData = new Float32Array(audioArrayBuffer);
  // const audioData = new Uint8Array(audioArrayBuffer);

  // const decodedAudio = decodedAudioResult.buffer;
  // const decodedAudioArrayBuffer = decodedAudio[0].buffer;

  // const audioContext = new AudioContext();
  // const audioBuffer = audioContext.createBuffer(
  //   1,
  //   decodedAudioArrayBuffer.byteLength,
  //   decodedAudioResult.metadata.sampleRate
  // );

  // const bufferSource = audioContext.createBufferSource();
  // bufferSource.buffer = audioBuffer;

  return {
    decodedAudio,
    audioFile,
    audioArrayBuffer,
    audioData,
  };
}

export function createAudioFileSource(
  source: string,
  format: AudioFormat
): AudioSource {
  return {
    type: 'file',
    format,
    source
  };
}

export async function decodeAudioFile(source: AudioSource): Promise<DecodedAudio> {
  const loader = new AudioLoader();
  try {
    return await loader.load(source);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('[decodeAudioFile] Unknown error occurred');
    }
    process.exit(1);
  }
}

async function loadAudio(source: AudioSource): Promise<DecodedAudio> {
  const loader = new AudioLoader();
  const decodedAudio = await loader.load(source);
  return decodedAudio;
}

async function main() {
  console.log('\n[ ~ wave-tools ~ ]\n');

  if (process.argv.length < 3) {
    console.error('Please provide an audio file path as argument');
    process.exit(1);
  }
  
  const audioPath = process.argv[2];
  let audioFormat: AudioFormat = 'wav';

  if (process.argv[3]) {
    audioFormat = process.argv[3] as AudioFormat;
    if (!Object.values(['wav', 'mp3'] as AudioFormat[]).includes(audioFormat)) {
      console.error('Invalid format. Supported formats are: wav, mp3');
      process.exit(1);
    }
  }

  const testAudioSource: AudioSource = {
    type: 'file', 
    format: audioFormat,
    source: audioPath
  };

  console.log('[main] AudioSource: ', testAudioSource);
  console.log('[main] Loading audio...');
  const audio = await loadAudio(testAudioSource);
  console.log('[main] Audio loaded - metadata: ', audio.metadata);
}

// main();
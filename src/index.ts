import { $ } from 'bun';
import path from 'node:path';
import { AudioLoader } from './loaders';
import { createWaveAnalyzer } from './processors/wave-analyzer';
import type { AudioFormat, AudioSource, DecodedAudio } from './types/audio';

export async function transcodeToWav(source: AudioSource) {
  try {
    const TRANSCODED_AUDIO_DIR = './data/transcoded';
    const inputFilename = path.basename(source.source as string, `.${source.format}`);
    const outputFilename = `${TRANSCODED_AUDIO_DIR}/${inputFilename}.wav`;
    console.log('[transcodeToWav] input: ', source.source);
    console.log('[transcodeToWav] output: ', outputFilename);

    const outputFile = Bun.file(outputFilename);
    const outputFileExists = await outputFile.exists();
    if (outputFileExists) {
      console.log(`[transcodeToWav] skipping '${outputFilename}' - transcoded file already exists`);
      process.exit(0);
    }

    console.log('[transcodeToWav] transcoding...');
    await $`ffmpeg -i ${source.source} -f wav ${outputFilename}`;
    console.log('[transcodeToWav] done!');

    process.exit(0);
  } catch (error) {
    console.error('[transcodeToWav] Error: ', error);
    process.exit(1);
  }
}

export async function analyzeAudioFile(source: AudioSource) {
  const { decodedAudio } = await initializeAudio(source);
  const signal = decodedAudio.buffer[0];
  const waveAnalyzer = createWaveAnalyzer(signal.buffer);
  console.log("[analyzeAudioFile] analyzing...");
  const result = waveAnalyzer.analyze();
  console.log("[analyzeAudioFile] done!");
  console.log("[analyzeAudioFile] WaveAnalyzerResult: ", result);
}

export async function initializeAudio(source: AudioSource) {
  console.log('[initializeAudio] initializing audio...');
  const loader = new AudioLoader();
  const decodedAudio = await loader.load(source);
  console.log('[initializeAudio] metadata: ', decodedAudio.metadata);
  return {
    decodedAudio,
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
import type { AudioFormat, AudioSource, DecodedAudio } from './types/audio';
import { AudioLoader } from './loaders';

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
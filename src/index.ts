import type { AudioFormat, AudioSource, DecodedAudio } from './types/audio';
import { AudioLoader } from './loaders';

const testAudioSource: AudioSource = {
  type: 'file',
  format: 'wav',
  source: './data/0_initializer.wav'
};

async function loadAudio(source: AudioSource): Promise<DecodedAudio> {
  const loader = new AudioLoader();
  const decodedAudio = await loader.load(source);
  return decodedAudio;
}

async function main() {
  console.log('\n[ ~ wave-tools ~ ]\n');
  console.log('[main] AudioSource: ', testAudioSource);
  console.log('[main] Loading audio...');
  const audio = await loadAudio(testAudioSource);
  console.log('[main] Audio loaded - metadata: ', audio.metadata);
}

main();
import type { AudioSource, AudioFormat, DecodedAudio, IAudioLoader } from '../types/audio';
import { AudioLoadError } from '../types/audio';

export class StreamAudioLoader implements IAudioLoader {
  public supports(format: AudioFormat): boolean {
    return ['mp3', 'wav'].includes(format);
  }

  public async load(source: AudioSource): Promise<DecodedAudio> {
    if (source.type !== 'stream') {
      throw new AudioLoadError(
        'StreamAudioLoader only supports stream sources',
        'FORMAT_ERROR'
      );
    }

    // TOOD: Implement stream loading
    throw new Error('Stream loading not yet implemented');
  }
}
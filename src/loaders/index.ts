import type { AudioSource, DecodedAudio, IAudioLoader } from '../types/audio';
import { AudioLoadError } from '../types/audio';
import { FileAudioLoader } from './file';
import { StreamAudioLoader } from './stream';

export class AudioLoader {
  private loaders: IAudioLoader[] = [];

  constructor() {
    this.loaders.push(
      new FileAudioLoader(),
      new StreamAudioLoader()
    );
  }

  public async load(source: AudioSource): Promise<DecodedAudio> {
    const loader = this.loaders.find(l => l.supports(source.format));
    
    if (!loader) {
      throw new AudioLoadError(
        `No loader available for format: ${source.format}`,
        'FORMAT_ERROR'
      );
    }

    return loader.load(source);
  }
}
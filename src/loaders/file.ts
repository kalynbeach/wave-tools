import type { AudioSource, AudioFormat, DecodedAudio, IAudioLoader } from '../types/audio';
import { AudioLoadError } from '../types/audio';

export class FileAudioLoader implements IAudioLoader {
  private static readonly WAVE_HEADER_SIZE = 44;
  private static readonly MP3_FRAME_HEADER_SIZE = 4;

  constructor(private readonly options: {
    validateFormat?: boolean;
    maxFileSize?: number;
  } = {}) {}

  public supports(format: AudioFormat): boolean {
    return ['mp3', 'wav'].includes(format);
  }

  public async load(source: AudioSource): Promise<DecodedAudio> {
    if (source.type !== 'file') {
      throw new AudioLoadError(
        'FileAudioLoader only supports file sources',
        'FORMAT_ERROR'
      );
    }

    try {
      const buffer = await this.readFile(source.source as string);
      const format = this.detectFormat(buffer);
      
      if (format !== source.format) {
        throw new AudioLoadError(
          `Format mismatch: expected ${source.format}, got ${format}`,
          'FORMAT_ERROR'
        );
      }

      return format === 'wav' 
        ? this.decodeWav(buffer)
        : this.decodeMp3(buffer);
    } catch (error) {
      if (error instanceof AudioLoadError) throw error;
      throw new AudioLoadError(
        'Failed to load audio file',
        'READ_ERROR',
        error
      );
    }
  }

  private async readFile(path: string): Promise<Uint8Array> {
    if (this.options.maxFileSize) {
      const file = Bun.file(path);
      const size = file.size;
      
      if (size > this.options.maxFileSize) {
        throw new AudioLoadError(
          `File size exceeds maximum allowed size of ${this.options.maxFileSize} bytes`,
          'READ_ERROR'
        );
      }
    }

    return new Uint8Array(await Bun.file(path).arrayBuffer());
  }

  private detectFormat(buffer: Uint8Array): AudioFormat {
    // Check WAV header
    if (
      buffer[0] === 0x52 && // R
      buffer[1] === 0x49 && // I
      buffer[2] === 0x46 && // F
      buffer[3] === 0x46    // F
    ) {
      return 'wav';
    }

    // Check MP3 header
    if (
      buffer[0] === 0xFF &&
      (buffer[1] & 0xE0) === 0xE0
    ) {
      return 'mp3';
    }

    throw new AudioLoadError(
      'Unsupported or invalid audio format',
      'FORMAT_ERROR'
    );
  }

  private async decodeWav(buffer: Uint8Array): Promise<DecodedAudio> {
    try {
      const view = new DataView(buffer.buffer);
      
      // Validate WAV format
      if (
        String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)) !== 'WAVE'
      ) {
        throw new AudioLoadError('Invalid WAV format', 'FORMAT_ERROR');
      }

      // Parse WAV header
      const channels = view.getUint16(22, true);
      const sampleRate = view.getUint32(24, true);
      const bitsPerSample = view.getUint16(34, true);
      
      // Find data chunk
      let offset = 36;
      let dataSize = 0;
      while (offset < buffer.length) {
        if (
          String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)) === 'data'
        ) {
          dataSize = view.getUint32(offset + 4, true);
          offset += 8;
          break;
        }
        offset += 8 + view.getUint32(offset + 4, true);
      }

      // Convert to float32 arrays per channel
      const samplesPerChannel = dataSize / (channels * (bitsPerSample / 8));
      const channelData: Float32Array[] = Array.from(
        { length: channels },
        () => new Float32Array(samplesPerChannel)
      );

      for (let i = 0; i < samplesPerChannel; i++) {
        for (let channel = 0; channel < channels; channel++) {
          let sample: number;
          
          if (bitsPerSample === 16) {
            sample = view.getInt16(offset, true) / 32768.0;
            offset += 2;
          } else if (bitsPerSample === 24) {
            sample = (view.getUint8(offset) + (view.getUint8(offset + 1) << 8) + (view.getUint8(offset + 2) << 16)) / 8388608.0;
            offset += 3;
          } else if (bitsPerSample === 32) {
            sample = view.getFloat32(offset, true);
            offset += 4;
          } else {
            throw new AudioLoadError(`Unsupported bits per sample: ${bitsPerSample}`, 'FORMAT_ERROR');
          }

          channelData[channel][i] = sample;
        }
      }

      return {
        buffer: channelData,
        metadata: {
          duration: samplesPerChannel / sampleRate,
          sampleRate,
          channels,
          format: 'wav',
          bitRate: sampleRate * channels * bitsPerSample
        }
      };
    } catch (error) {
      if (error instanceof AudioLoadError) throw error;
      throw new AudioLoadError('Failed to decode WAV file', 'DECODE_ERROR', error);
    }
  }

  private async decodeMp3(buffer: Uint8Array): Promise<DecodedAudio> {
    // For MP3, we'll need to use a decoder library or native APIs
    // This is a placeholder for the MP3 decoding implementation
    throw new Error('MP3 decoding not yet implemented');
  }
}

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
    try {
      // MP3 Frame structure constants
      const FRAME_SYNC = 0xFFE0;
      const SAMPLING_RATES = [44100, 48000, 32000];
      const BITRATES = [
        0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320
      ];

      // Frame analysis for metadata extraction
      let offset = 0;
      let firstFrameFound = false;
      let sampleRate = 0;
      let channels = 0;
      let bitRate = 0;
      let totalFrames = 0;

      // Find first valid frame and extract metadata
      while (offset < buffer.length - 4) {
        // Check for frame sync
        const header = (buffer[offset] << 8) | buffer[offset + 1];
        if ((header & FRAME_SYNC) === FRAME_SYNC) {
          // Parse frame header
          const version = (buffer[offset + 1] >> 3) & 0x03;
          const layer = (buffer[offset + 1] >> 1) & 0x03;
          const protection = buffer[offset + 1] & 0x01;
          const bitrateIndex = (buffer[offset + 2] >> 4) & 0x0F;
          const samplingRateIndex = (buffer[offset + 2] >> 2) & 0x03;
          const padding = (buffer[offset + 2] >> 1) & 0x01;
          const channelMode = (buffer[offset + 3] >> 6) & 0x03;

          // Validate frame
          if (version !== 3 || layer !== 1) { // We only support MPEG1 Layer III for now
            offset++;
            continue;
          }

          if (!firstFrameFound) {
            sampleRate = SAMPLING_RATES[samplingRateIndex];
            channels = channelMode === 3 ? 1 : 2;
            bitRate = BITRATES[bitrateIndex] * 1000;
            firstFrameFound = true;
          }

          // Calculate frame size
          const frameSize = Math.floor((144 * bitRate / sampleRate) + padding);
          offset += frameSize;
          totalFrames++;
        } else {
          offset++;
        }
      }

      if (!firstFrameFound) {
        throw new AudioLoadError('No valid MP3 frames found', 'FORMAT_ERROR');
      }

      // Calculate approximate duration
      const samplesPerFrame = 1152; // MPEG1 Layer III constant
      const duration = (totalFrames * samplesPerFrame) / sampleRate;

      // Decode MP3 data
      const audioData = await this.decodeMP3Frames(buffer, channels, totalFrames);

      return {
        buffer: audioData,
        metadata: {
          duration,
          sampleRate,
          channels,
          format: 'mp3',
          bitRate
        }
      };
    } catch (error) {
      if (error instanceof AudioLoadError) throw error;
      throw new AudioLoadError('Failed to decode MP3 file', 'DECODE_ERROR', error);
    }
  }

  private async decodeMP3Frames(
    buffer: Uint8Array,
    channels: number,
    totalFrames: number
  ): Promise<Float32Array[]> {
    // Create audio context for decoding
    // const audioContext = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    const audioContext = new AudioContext();
    
    try {
      // Use Web Audio API for decoding
      const audioBuffer = await audioContext.decodeAudioData(buffer.buffer as ArrayBuffer);
      
      // Extract channel data
      const channelData: Float32Array[] = [];
      for (let i = 0; i < channels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
      }
      
      return channelData;
    } finally {
      await audioContext.close();
    }
  }
}

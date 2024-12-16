import type { AudioSource, AudioFormat, AudioMetadata, DecodedAudio, IAudioLoader } from '../types/audio';
import { AudioLoadError } from '../types/audio';

export interface StreamConfig {
  chunkSize?: number;
  maxBufferSize?: number;
  onProgress?: (processed: number, total: number) => void;
}

interface StreamDecoder {
  processChunk(chunk: Uint8Array): Promise<void>;
  finalize(): Promise<DecodedAudio>;
}

export class StreamAudioLoader implements IAudioLoader {
  private static readonly DEFAULT_CHUNK_SIZE = 16384; // 16KB chunks
  private static readonly MAX_BUFFER_SIZE = 1024 * 1024 * 10; // 10MB

  constructor(private config: StreamConfig = {}) {
    this.config.chunkSize = config.chunkSize || StreamAudioLoader.DEFAULT_CHUNK_SIZE;
    this.config.maxBufferSize = config.maxBufferSize || StreamAudioLoader.MAX_BUFFER_SIZE;
  }

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

    try {
      const stream = source.source as ReadableStream;
      const format = source.format;
      
      const decoder = this.createDecoder(format);
      return await this.processStream(stream, decoder);
    } catch (error) {
      if (error instanceof AudioLoadError) throw error;
      throw new AudioLoadError(
        'Failed to process audio stream',
        'DECODE_ERROR',
        error
      );
    }
  }

  private createDecoder(format: AudioFormat): StreamDecoder {
    switch (format) {
      case 'mp3':
        return new MP3StreamDecoder();
      case 'wav':
        return new WAVStreamDecoder();
      default:
        throw new AudioLoadError(
          `Unsupported format for streaming: ${format}`,
          'FORMAT_ERROR'
        );
    }
  }

  private async processStream(
    stream: ReadableStream,
    decoder: StreamDecoder
  ): Promise<DecodedAudio> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    let processedBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        totalBytes += value.length;
        
        // Process chunks when we have enough data
        if (totalBytes >= this.config.chunkSize!) {
          await decoder.processChunk(this.combineChunks(chunks));
          processedBytes += totalBytes;
          chunks.length = 0;
          totalBytes = 0;
          
          if (this.config.onProgress) {
            this.config.onProgress(processedBytes, -1); // -1 for unknown total
          }
        }

        // Check buffer size limit
        if (totalBytes > this.config.maxBufferSize!) {
          throw new AudioLoadError(
            'Stream buffer size limit exceeded',
            'DECODE_ERROR'
          );
        }
      }

      // Process remaining chunks
      if (chunks.length > 0) {
        await decoder.processChunk(this.combineChunks(chunks));
      }

      return decoder.finalize();
    } finally {
      reader.releaseLock();
    }
  }

  private combineChunks(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combined;
  }
}

class MP3StreamDecoder implements StreamDecoder {
  private readonly frameBuffer: Uint8Array[] = [];
  private metadata: AudioMetadata | null = null;
  private totalFrames = 0;
  private sampleBuffer: Float32Array[][] = [];

  private static readonly FRAME_SYNC = 0xFFE0;
  private static readonly SAMPLING_RATES = [44100, 48000, 32000];
  private static readonly BITRATES = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320
  ];

  async processChunk(chunk: Uint8Array): Promise<void> {
    // Add chunk to frame buffer
    this.frameBuffer.push(chunk);

    // Process complete frames
    await this.processFrames();
  }

  private async processFrames(): Promise<void> {
    const buffer = this.combineFrameBuffers();
    let offset = 0;

    while (offset < buffer.length - 4) {
      const header = (buffer[offset] << 8) | buffer[offset + 1];
      
      if ((header & MP3StreamDecoder.FRAME_SYNC) === MP3StreamDecoder.FRAME_SYNC) {
        const frameInfo = this.parseFrameHeader(buffer.slice(offset));
        
        if (!frameInfo) {
          offset++;
          continue;
        }

        if (!this.metadata) {
          this.metadata = {
            sampleRate: frameInfo.sampleRate,
            channels: frameInfo.channels,
            format: 'mp3',
            duration: 0, // Will be calculated in finalize()
            bitRate: frameInfo.bitRate
          };
        }

        if (offset + frameInfo.frameSize <= buffer.length) {
          const frame = buffer.slice(offset, offset + frameInfo.frameSize);
          await this.decodeFrame(frame);
          offset += frameInfo.frameSize;
          this.totalFrames++;
        } else {
          break;
        }
      } else {
        offset++;
      }
    }

    // Keep remaining data
    if (offset < buffer.length) {
      this.frameBuffer[0] = buffer.slice(offset);
    } else {
      this.frameBuffer.length = 0;
    }
  }

  private async decodeFrame(frame: Uint8Array): Promise<void> {
    // TODO: figure out a Node.js alternative for AudioContext (if needed?)
    const audioContext = new AudioContext();

    try {
      // const audioBuffer = await audioContext.decodeAudioData(frame.buffer);
      const audioBuffer = await audioContext.decodeAudioData(frame.buffer as ArrayBuffer);
      
      // Store decoded samples
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        if (!this.sampleBuffer[channel]) {
          this.sampleBuffer[channel] = [];
        }
        this.sampleBuffer[channel].push(audioBuffer.getChannelData(channel));
      }
    } finally {
      await audioContext.close();
    }
  }

  private combineFrameBuffers(): Uint8Array {
    const totalLength = this.frameBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of this.frameBuffer) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combined;
  }

  private parseFrameHeader(headerBuffer: Uint8Array): {
    frameSize: number;
    sampleRate: number;
    channels: number;
    bitRate: number;
  } | null {
    const version = (headerBuffer[1] >> 3) & 0x03;
    const layer = (headerBuffer[1] >> 1) & 0x03;
    const bitrateIndex = (headerBuffer[2] >> 4) & 0x0F;
    const samplingRateIndex = (headerBuffer[2] >> 2) & 0x03;
    const padding = (headerBuffer[2] >> 1) & 0x01;
    const channelMode = (headerBuffer[3] >> 6) & 0x03;

    // Validate frame
    if (version !== 3 || layer !== 1) return null; // MPEG1 Layer III only for now

    const sampleRate = MP3StreamDecoder.SAMPLING_RATES[samplingRateIndex];
    const bitRate = MP3StreamDecoder.BITRATES[bitrateIndex] * 1000;
    const frameSize = Math.floor((144 * bitRate / sampleRate) + padding);

    return {
      frameSize,
      sampleRate,
      channels: channelMode === 3 ? 1 : 2,
      bitRate
    };
  }

  async finalize(): Promise<DecodedAudio> {
    if (!this.metadata || this.totalFrames === 0) {
      throw new AudioLoadError('No valid MP3 frames decoded', 'DECODE_ERROR');
    }

    // Combine all sample buffers
    const channels = this.sampleBuffer.length;
    const samplesPerChannel = this.sampleBuffer[0].reduce(
      (sum, buffer) => sum + buffer.length,
      0
    );

    const finalBuffer: Float32Array[] = Array.from(
      { length: channels },
      () => new Float32Array(samplesPerChannel)
    );

    for (let channel = 0; channel < channels; channel++) {
      let offset = 0;
      for (const buffer of this.sampleBuffer[channel]) {
        finalBuffer[channel].set(buffer, offset);
        offset += buffer.length;
      }
    }

    this.metadata.duration = samplesPerChannel / this.metadata.sampleRate;

    return {
      buffer: finalBuffer,
      metadata: this.metadata
    };
  }
}

class WAVStreamDecoder implements StreamDecoder {
  private headerProcessed = false;
  private metadata: AudioMetadata | null = null;
  private dataSize = 0;
  private sampleBuffer: Float32Array[] = [];
  private bytesProcessed = 0;

  async processChunk(chunk: Uint8Array): Promise<void> {
    if (!this.headerProcessed) {
      await this.processHeader(chunk);
    } else {
      await this.processData(chunk);
    }
  }

  private async processHeader(chunk: Uint8Array): Promise<void> {
    const view = new DataView(chunk.buffer);
    
    // Validate WAV format
    if (
      String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)) !== 'WAVE'
    ) {
      throw new AudioLoadError('Invalid WAV format', 'FORMAT_ERROR');
    }

    this.metadata = {
      channels: view.getUint16(22, true),
      sampleRate: view.getUint32(24, true),
      format: 'wav',
      duration: 0, // Will be calculated in finalize()
      bitRate: view.getUint16(34, true)
    };

    // Find data chunk
    let offset = 36;
    while (offset < chunk.length - 8) {
      if (
        String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        ) === 'data'
      ) {
        this.dataSize = view.getUint32(offset + 4, true);
        offset += 8;
        break;
      }
      offset += 8 + view.getUint32(offset + 4, true);
    }

    this.headerProcessed = true;
    
    // Process remaining data if any
    if (offset < chunk.length) {
      await this.processData(chunk.slice(offset));
    }
  }

  private async processData(chunk: Uint8Array): Promise<void> {
    if (!this.metadata) {
      throw new AudioLoadError('WAV header not processed', 'DECODE_ERROR');
    }

    const view = new DataView(chunk.buffer);
    const bytesPerSample = this.metadata.bitRate / 8;
    const samplesPerChannel = Math.floor(chunk.length / (bytesPerSample * this.metadata.channels));

    // Initialize channel buffers if needed
    if (this.sampleBuffer.length === 0) {
      this.sampleBuffer = Array.from(
        { length: this.metadata.channels },
        () => new Float32Array(Math.ceil(this.dataSize / (bytesPerSample * this.metadata!.channels)))
      );
    }

    // Process samples
    let offset = 0;
    for (let i = 0; i < samplesPerChannel; i++) {
      for (let channel = 0; channel < this.metadata.channels; channel++) {
        let sample: number;

        if (this.metadata.bitRate === 16) {
          sample = view.getInt16(offset, true) / 32768.0;
          offset += 2;
        } else if (this.metadata.bitRate === 24) {
          sample = (
            view.getUint8(offset) +
            (view.getUint8(offset + 1) << 8) +
            (view.getUint8(offset + 2) << 16)
          ) / 8388608.0;
          offset += 3;
        } else if (this.metadata.bitRate === 32) {
          sample = view.getFloat32(offset, true);
          offset += 4;
        } else {
          throw new AudioLoadError(
            `Unsupported bits per sample: ${this.metadata.bitRate}`,
            'FORMAT_ERROR'
          );
        }

        const sampleIndex = Math.floor(this.bytesProcessed / (bytesPerSample * this.metadata.channels));
        this.sampleBuffer[channel][sampleIndex] = sample;
      }
    }

    this.bytesProcessed += offset;
  }

  async finalize(): Promise<DecodedAudio> {
    if (!this.metadata || this.bytesProcessed === 0) {
      throw new AudioLoadError('No WAV data processed', 'DECODE_ERROR');
    }

    // Trim buffers to actual size
    const finalSamples = Math.floor(this.bytesProcessed / (this.metadata.bitRate / 8 * this.metadata.channels));
    const finalBuffer = this.sampleBuffer.map(
      channelBuffer => channelBuffer.slice(0, finalSamples)
    );

    this.metadata.duration = finalSamples / this.metadata.sampleRate;

    return {
      buffer: finalBuffer,
      metadata: this.metadata
    };
  }
}
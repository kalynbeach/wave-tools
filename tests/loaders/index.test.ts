import { describe, it, expect } from "bun:test";
import { AudioLoader } from "../../src/loaders/index";
import { AudioLoadError } from "../../src/types/audio";
import type { AudioSource } from "../../src/types/audio";
import { FileAudioLoader } from "../../src/loaders/file";
import { StreamAudioLoader } from "../../src/loaders/stream";

describe("AudioLoader", () => {
  it("should initialize with file and stream loaders", () => {
    const loader = new AudioLoader();
    // @ts-ignore - accessing private property for testing
    expect(loader.loaders).toHaveLength(2);
    // @ts-ignore - accessing private property for testing
    expect(loader.loaders[0]).toBeInstanceOf(FileAudioLoader);
    // @ts-ignore - accessing private property for testing
    expect(loader.loaders[1]).toBeInstanceOf(StreamAudioLoader);
  });

  it("should load WAV file source", async () => {
    const loader = new AudioLoader();
    const source: AudioSource = {
      type: "file",
      format: "wav",
      source: "test.wav"
    };

    // Mock FileAudioLoader's load method
    // @ts-ignore - accessing private property for testing
    loader.loaders[0].load = async () => ({
      buffer: [new Float32Array([0.1, 0.2, 0.3])],
      metadata: {
        duration: 1,
        sampleRate: 44100,
        channels: 1,
        format: "wav",
        bitRate: 16
      }
    });

    const result = await loader.load(source);
    expect(result.buffer).toHaveLength(1);
    expect(result.metadata.format).toBe("wav");
    expect(result.metadata.channels).toBe(1);
    expect(result.metadata.sampleRate).toBe(44100);
  });

  it("should load MP3 file source", async () => {
    const loader = new AudioLoader();
    const source: AudioSource = {
      type: "file",
      format: "mp3",
      source: "test.mp3"
    };

    // Mock FileAudioLoader's load method
    // @ts-ignore - accessing private property for testing
    loader.loaders[0].load = async () => ({
      buffer: [new Float32Array([0.1, 0.2, 0.3])],
      metadata: {
        duration: 1,
        sampleRate: 44100,
        channels: 1,
        format: "mp3",
        bitRate: 128000
      }
    });

    const result = await loader.load(source);
    expect(result.buffer).toHaveLength(1);
    expect(result.metadata.format).toBe("mp3");
    expect(result.metadata.channels).toBe(1);
    expect(result.metadata.sampleRate).toBe(44100);
  });

  it("should load audio stream source", async () => {
    const loader = new AudioLoader();
    // Mock both loaders to ensure correct loader is selected
    // @ts-ignore - accessing private property for testing
    loader.loaders[0].supports = (format: string) => format === 'wav';
    // @ts-ignore - accessing private property for testing
    loader.loaders[1].supports = (format: string) => format === 'mp3';

    const source: AudioSource = {
      type: "stream",
      format: "mp3",
      source: new ReadableStream()
    };

    // Mock StreamAudioLoader's load method
    // @ts-ignore - accessing private property for testing
    loader.loaders[1].load = async () => ({
      buffer: [new Float32Array([0.1, 0.2, 0.3])],
      metadata: {
        duration: 1,
        sampleRate: 44100,
        channels: 1,
        format: "mp3",
        bitRate: 128000
      }
    });

    const result = await loader.load(source);
    expect(result.buffer).toHaveLength(1);
    expect(result.metadata.format).toBe("mp3");
    expect(result.metadata.channels).toBe(1);
    expect(result.metadata.sampleRate).toBe(44100);
  });

  it("should throw error for unsupported format", async () => {
    const loader = new AudioLoader();
    const source: AudioSource = {
      type: "file",
      // @ts-ignore - intentionally testing invalid format
      format: "aac",
      source: "test.aac"
    };

    await expect(loader.load(source)).rejects.toThrow(AudioLoadError);
    await expect(loader.load(source)).rejects.toThrow("No loader available for format: aac");
  });

  it("should throw error when loader fails", async () => {
    const loader = new AudioLoader();
    const source: AudioSource = {
      type: "file",
      format: "wav",
      source: "nonexistent.wav"
    };

    // Mock FileAudioLoader's load method to throw
    // @ts-ignore - accessing private property for testing
    loader.loaders[0].load = async () => {
      throw new AudioLoadError("Failed to load audio file", "READ_ERROR");
    };

    await expect(loader.load(source)).rejects.toThrow(AudioLoadError);
    await expect(loader.load(source)).rejects.toThrow("Failed to load audio file");
  });
});
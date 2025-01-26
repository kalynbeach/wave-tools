import { Command } from 'commander';
import { z } from 'zod';
import type { AudioFormat, AudioSource } from '../types/audio';
import {
  createAudioFileSource,
  decodeAudioFile,
  analyzeAudioFile,
  transcodeToWav,
} from '../index';

const optionsSchema = z.object({
  source: z.string().min(1),
  format: z.string().min(1).max(3).default('wav'),
  output: z.string().optional(),
});

const program = new Command();

program
  .name('wave-tools')
  .description('Sound analysis tools')
  .version('0.1.0')

program.command('decode')
  .description('Decode audio data')
  .argument('<source>', 'Audio source (file path or stream URL)')
  .option('-f, --format <format>', 'Audio format (wav, mp3)', 'wav')
  .option('-o, --output <output>', 'Output directory path')
  .action(async (source: string, options: z.infer<typeof optionsSchema>) => {
    await decode(source, options);
  });

program.command('transcode')
  .description('Transcode audio data')
  .argument('<source>', 'Audio source (file path or stream URL)')
  .option('-f, --format <format>', 'Audio format (wav, mp3)', 'wav')
  .option('-o, --output <output>', 'Output directory path')
  .action(async (source: string, options: z.infer<typeof optionsSchema>) => {
    await transcode(source, options);
  });

program.command('analyze')
  .description('Analyze audio data')
  .argument('<source>', 'Audio source (file path or stream URL)')
  .option('-f, --format <format>', 'Audio format (wav, mp3)', 'wav')
  .option('-o, --output <output>', 'Output directory path')
  .action(async (source: string, options: z.infer<typeof optionsSchema>) => {
    await analyze(source, options);
  });

program.parse();

// CLI Command Actions

async function decode(source: string, options: z.infer<typeof optionsSchema>) {
  console.log('[decode] options: ', options);
  const audioSource = createAudioFileSource(source, options.format as AudioFormat);
  console.log('[decode] audioSource: ', audioSource);
  console.log('[decode] decoding audio...');
  const decodedAudio = await decodeAudioFile(audioSource);
  console.log('[decode] done!');
  console.log('[decode] metadata: ', decodedAudio.metadata);
}

async function transcode(source: string, options: z.infer<typeof optionsSchema>) {
  const audioSource = createAudioFileSource(source, options.format as AudioFormat);
  // console.log('[transcode] audioSource: ', audioSource);
  await transcodeToWav(audioSource);
}

async function analyze(source: string, options: z.infer<typeof optionsSchema>) {
  const audioSource = createAudioFileSource(source, options.format as AudioFormat);
  console.log('[analyze] audioSource: ', audioSource);
  await analyzeAudioFile(audioSource);
}

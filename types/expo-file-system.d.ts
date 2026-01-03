declare module 'expo-file-system' {
  export const cacheDirectory: string | null;
  export function getInfoAsync(uri: string): Promise<{ exists: boolean; isDirectory: boolean; size: number }>;
  // add more members as needed
}

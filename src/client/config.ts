export interface DeckConfig {
  filename: string
  source: string
  title?: string
  css?: string
  dark?: boolean
  progressBar?: boolean
  saveToken?: string
  mode?: 'embed' | 'site'
}

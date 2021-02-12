import { Config } from 'bili'

const config: Config = {
  input: 'src/index.ts',
  output: {
    fileName: 'markdown-deck[min][ext]',
    moduleName: 'MarkdownDeck',
    sourceMap: false,
  },
  plugins: {
    babel: false
  }
}

export default config

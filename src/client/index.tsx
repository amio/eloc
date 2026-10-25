import { render } from 'solid-js/web'
import { App } from './app'
import type { DeckConfig } from './config'

const config: DeckConfig = JSON.parse(document.getElementById('eloc-config')!.textContent!)
render(() => <App config={config} />, document.getElementById('app')!)

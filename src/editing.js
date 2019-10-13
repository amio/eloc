(function () {
  const deck = document.querySelector('markdown-deck')

  window.addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey) {
      if (ev.code === 'KeyS') {
        ev.preventDefault()
        save(deck.markdown)
      }
    }
  })

  function save (markdown) {
    return fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown })
    }).then(async res => {
      if (res.status === 200) {
        console.info(await res.text())
      } else {
        console.error(await res.text())
      }
    }, console.error)
  }
})()

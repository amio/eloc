/**
 * This file will be embedded into index.html
 */

(function () {
  const deck = document.querySelector('markdown-deck')

  if (!deck) return

  window.addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey) {
      if (ev.code === 'KeyS') {
        ev.preventDefault()
        deck.markdown && save(deck.markdown)
      }
    }
  })

  async function save (markdown) {
    return fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown })
    }).then(async res => {
      const msg = await res.text()
      if (res.status === 200) {
        console.info(msg)
        toast(msg, 'success')
      } else {
        console.error(msg)
        toast(msg, 'error')
      }
    }).catch((err) => {
      toast('Eloc server is closed', 'error')
      console.error(err)
    })
  }

  function toast (msg, type = 'info') {
    const toastElem = document.createElement('div')
    toastElem.className = `toast ${type}`
    toastElem.innerText = msg
    toastElem.onanimationend = () => document.body.removeChild(toastElem)

    document.body.insertAdjacentElement('beforeend', toastElem)
  }
})()

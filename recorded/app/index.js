const API_URL = 'http://localhost:3000'

async function consumeAPI(signal) {
  console.log('called!')
  const response = await fetch(API_URL, {
    signal
  })

  const reader = response.body
    .pipeThrough(
      new TextDecoderStream()
    )
    .pipeThrough(
      parseNDJSON()
    )

  // .pipeTo(
  //   new WritableStream({
  //     write(chunk) {
  //       console.log('chunk', chunk)
  //     }
  //   })
  // )
  return reader
}
// this function will make sure tht if two chunks come from a single transmission
// convert it and split in break lines
// given: {}\n{}\n
// should be:
// {}
// {}

function parseNDJSON() {
  return new TransformStream({
    transform(chunk, controller) {
      for (const item of chunk.split('\n')) {
        if (!item.length) continue
        try {
          controller.enqueue(JSON.parse(item))
        } catch (error) {
          // this exception is a common problem that we won't handle in this class:
          // if the arrived data is not completed, it should be stored in memory 
          // until completed
          // 1st msg received - {"name": "er"
          // 2st msg received - "ick"}\n
          // result           {"name": "erick"}\n
        }
      }
    }
  })
}
let counter = 0
let elementCounter = 0
function appendToHtml(element) {
  return new WritableStream({
    write({ title, description, url }) {
      const card = `
      <article>
        <div class="text">
          <h3>[${++counter}] ${title}</h3>
          <p>${description.slice(0, 100)}</p>
          <a href="${url}">Here's why</a>
        </div>
      </article>
      `
      if (++elementCounter > 20) {
        element.innerHTML = card
        elementCounter = 0
        return
      }

      element.innerHTML += card
    },
    abort(reason) {
      console.log('aborted*', reason)
    }
  })
}


const [
  start,
  stop,
  cards
] = ['start', 'stop', 'cards'].map(item => document.getElementById(item))

let abortController = new AbortController()
start.addEventListener('click', async () => {
  try {
    const reader = await consumeAPI(abortController.signal)
    await reader.pipeTo(appendToHtml(cards), { signal: abortController.signal })
  } catch (error) {
    if (!error.message.includes('abort')) throw error
  }
})

stop.addEventListener('click', () => {
  abortController.abort()
  console.log('aborting...')
  abortController = new AbortController()
})
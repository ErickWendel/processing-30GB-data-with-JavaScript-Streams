const API_URL = 'http://localhost:3000'
let counter = 0

async function consumeAPI(signal) {
  const response = await fetch(API_URL, {
    signal
  })
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseNDJSON())
  // .pipeTo(new WritableStream({
  //   write(chunk) {
  //     console.log(++counter, 'chunk', chunk)
  //   }
  // }))

  return reader
}

function appendToHTML(element) {
  let elementsCounter = 0
  return new WritableStream({
    write({ title, description, url_anime }) {
      const card = `
      <article>
        <div class="text">
          <h3>[${++counter}] ${title}</h3>
          <p>${description.slice(0, 100)}</p>
          <a href="${url_anime}"> Here's why</a>
        </div>
      </article>
      `
      if (++elementsCounter > 20) {
        element.innerHTML = card
        elementsCounter = 0
        return
      }

      element.innerHTML += card
    },
    abort(reason) {
      console.log('aborted**', reason)
    }
  })
}

// this function will make shure that if two chunks come from a single transmission
// convert it split it in break lines
// given:{}\n{}
// should be:
//    {}
//    {}

function parseNDJSON() {
  // let ndjsonBuffer = ''
  return new TransformStream({
    transform(chunk, controller) {
      for (const item of chunk.split('\n')) {
        try {
          controller.enqueue(JSON.parse(item))
        } catch (error) {
          // this exception is a common problem that we won't handle in this class:
          // if the arrived data is not completed, it should stored in memory until completed
          // 1st msg received -  {"name": "er
          // 2nd msg received -  "ick"}\n
          //result:           {"name": "erick"}\n
        }
      }

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
    const readable = await consumeAPI(abortController.signal)
    // add signal and await to handle the abortError exception after abortion
    await readable.pipeTo(appendToHTML(cards), { signal: abortController.signal })
  } catch (error) {
    if (!error.message.includes('abort')) throw error
  }
})

stop.addEventListener('click', () => {
  abortController.abort()
  console.log('aborting...')
  abortController = new AbortController()
})




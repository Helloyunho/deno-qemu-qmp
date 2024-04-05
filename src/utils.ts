export async function* makeJSONLIterator(stream: ReadableStream<Uint8Array>) {
  const utf8Decoder = new TextDecoder('utf-8')
  const reader = stream.getReader()
  let { value: chunk, done: readerDone } = await reader.read()
  let strChunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : ''

  const re = /\r\n|\n|\r/gm
  let startIndex = 0

  while (true) {
    const result = re.exec(strChunk)
    if (!result) {
      if (readerDone) {
        break
      }
      const remainder = strChunk.slice(startIndex)
      ;({ value: chunk, done: readerDone } = await reader.read())
      strChunk =
        remainder +
        (strChunk ? utf8Decoder.decode(chunk, { stream: true }) : '')
      startIndex = re.lastIndex = 0
      continue
    }
    yield JSON.parse(strChunk.substring(startIndex, result.index))
    startIndex = re.lastIndex
  }
  if (startIndex < strChunk.length) {
    // last line didn't end in a newline char
    yield JSON.parse(strChunk.slice(startIndex))
  }
}

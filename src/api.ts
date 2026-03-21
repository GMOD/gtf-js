import Parser from './parse'
import { formatItem, formatSequence } from './util'
import type { GTFItem } from './util'

import { Transform } from 'stream'
import { StringDecoder as Decoder } from 'string_decoder'

// don't load fs native module if running in webpacked code
// eslint-disable-next-line camelcase
declare const __webpack_require__: unknown
const fs = typeof __webpack_require__ !== 'function' ? require('fs') : null

// call a callback on the next process tick if running in
// an environment that supports it
function _callback(callback: () => void) {
  if (process && process.nextTick) {
    process.nextTick(callback)
  } else {
    callback()
  }
}

interface ParseOptions {
  parseFeatures?: boolean
  parseDirectives?: boolean
  parseSequences?: boolean
  parseComments?: boolean
  parseAll?: boolean
  bufferSize?: number
  encoding?: string
}

// shared arg processing for the parse routines
function _processParseOptions(
  options: ParseOptions,
  additionalDefaults: ParseOptions = {},
) {
  const out = Object.assign(
    {
      parseFeatures: true,
      parseDirectives: false,
      parseSequences: true,
      parseComments: false,
    },
    additionalDefaults,
    options,
  )

  if (options.parseAll) {
    out.parseFeatures = true
    out.parseDirectives = true
    out.parseComments = true
    out.parseSequences = true
  }

  return out
}

class GTFTransform extends Transform {
  encoding: string
  decoder: Decoder
  textBuffer: string
  parser: Parser
  maxLineLength?: number

  constructor(inputOptions: ParseOptions = {}) {
    const options = _processParseOptions(inputOptions)
    super({ objectMode: true })

    this.encoding = inputOptions.encoding || 'utf8'

    this.decoder = new Decoder()
    this.textBuffer = ''

    const push = this.push.bind(this)
    this.parser = new Parser({
      featureCallback: options.parseFeatures ? push : null,
      directiveCallback: options.parseDirectives ? push : null,
      commentCallback: options.parseComments ? push : null,
      sequenceCallback: options.parseSequences ? push : null,
      errorCallback: err => this.emit('error', err),
      bufferSize: options.bufferSize,
    })
  }

  _addLine(data: Buffer | string) {
    const line = data.toString('utf8')
    if (line) {
      this.parser.addLine(line)
    }
  }

  _nextText(buffer: string) {
    const pieces = (this.textBuffer + buffer).split(/\r?\n/)
    this.textBuffer = pieces.pop() ?? ''

    if (this.maxLineLength && this.textBuffer.length > this.maxLineLength) {
      this.emit('error', new Error('maximum line size exceeded'))
      return
    }

    pieces.forEach(piece => this._addLine(piece))
  }

  _transform(chunk: Buffer | string, encoding: string, callback: () => void) {
    this._nextText(this.decoder.write(chunk as Buffer))
    _callback(callback)
  }

  _flush(callback: () => void) {
    if (this.decoder.end) {
      this._nextText(this.decoder.end())
    }
    if (this.textBuffer != null) {
      this._addLine(this.textBuffer)
    }
    this.parser.finish()
    _callback(callback)
  }
}

/**
 * Parse a stream of text data into a stream of feature,
 * directive, and comment objects.
 *
 * @param {Object} options optional options object
 * @param {string} options.encoding text encoding of the input GTF. default 'utf8'
 * @param {boolean} options.parseAll default false.  if true, will parse all items. overrides other flags
 * @param {boolean} options.parseFeatures default true
 * @param {boolean} options.parseDirectives default false
 * @param {boolean} options.parseComments default false
 * @param {boolean} options.parseSequences default true
 * @param {Number} options.bufferSize maximum number of GTF lines to buffer. defaults to 1000
 * @returns {ReadableStream} stream (in objectMode) of parsed items
 */
export function parseStream(options: ParseOptions = {}) {
  const newOptions = Object.assign({ bufferSize: 1000 }, options)
  return new GTFTransform(newOptions)
}

/**
 * Read and parse a GTF file from the filesystem.
 *
 * @param {string} filename the filename of the file to parse
 * @param {Object} options optional options object
 * @param {string} options.encoding the file's string encoding, defaults to 'utf8'
 * @param {boolean} options.parseAll default false.  if true, will parse all items. overrides other flags
 * @param {boolean} options.parseFeatures default true
 * @param {boolean} options.parseDirectives default false
 * @param {boolean} options.parseComments default false
 * @param {boolean} options.parseSequences default true
 * @param {Number} options.bufferSize maximum number of GTF lines to buffer. defaults to 1000
 * @returns {ReadableStream} stream (in objectMode) of parsed items
 */
export function parseFile(filename: string, options: ParseOptions) {
  return fs.createReadStream(filename).pipe(parseStream(options))
}

/**
 * Synchronously parse a string containing GTF and return
 * an arrayref of the parsed items.
 *
 * @param {string} str
 * @param {Object} inputOptions optional options object
 * @param {boolean} inputOptions.parseAll default false.  if true, will parse all items. overrides other flags
 * @param {boolean} inputOptions.parseFeatures default true
 * @param {boolean} inputOptions.parseDirectives default false
 * @param {boolean} inputOptions.parseComments default false
 * @param {boolean} inputOptions.parseSequences default true
 * @returns {Array} array of parsed features, directives, and/or comments
 */
export function parseStringSync(str: string, inputOptions: ParseOptions = {}) {
  if (!str) {
    return []
  }

  const options = _processParseOptions(inputOptions)

  const items: unknown[] = []
  const push = items.push.bind(items)

  const parser = new Parser({
    featureCallback: options.parseFeatures ? push : null,
    directiveCallback: options.parseDirectives ? push : null,
    commentCallback: options.parseComments ? push : null,
    sequenceCallback: options.parseSequences ? push : null,
    bufferSize: Infinity,
    errorCallback: err => {
      throw err
    },
  })

  str.split(/\r?\n/).forEach(parser.addLine.bind(parser))
  parser.finish()

  return items
}

/**
 * Format an array of GTF items (features,directives,comments) into string of GTF.
 * Does not insert synchronization (###) marks.
 * Does not insert directive if it's not already there.
 *
 * @param {Array[Object]} items
 * @returns {String} the formatted GTF
 */
export function formatSync(items: GTFItem[]) {
  // sort items into seq and other
  const other: GTFItem[] = []
  const sequences: GTFItem[] = []
  items.forEach(i => {
    if ((i as { sequence?: string }).sequence) {
      sequences.push(i)
    } else {
      other.push(i)
    }
  })
  let str = other.map(formatItem).join('')
  if (sequences.length) {
    str += '##FASTA\n'
    str += sequences
      .map(i => formatSequence(i as Parameters<typeof formatSequence>[0]))
      .join('')
  }
  return str
}

type NodeBufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex'

interface FormattingOptions {
  minSyncLines?: number
  insertVersionDirective?: boolean
  encoding?: NodeBufferEncoding
  objectMode?: boolean
}

class FormattingTransform extends Transform {
  linesSinceLastSyncMark: number
  minLinesBetweenSyncMarks: number
  insertVersionDirective: boolean
  haveWeEmittedData: boolean
  fastaMode: boolean

  constructor(options: FormattingOptions = {}) {
    super(Object.assign(options, { objectMode: true }))
    this.linesSinceLastSyncMark = 0
    this.minLinesBetweenSyncMarks = options.minSyncLines || 100
    this.insertVersionDirective = options.insertVersionDirective || false
    this.haveWeEmittedData = false
    this.fastaMode = false
  }

  _transform(
    chunk: GTFItem | GTFItem[],
    encoding: string,
    callback: () => void,
  ) {
    // if we have not emitted anything yet, and this first
    // chunk is not a gtf directive, emit one
    let str
    if (
      !this.haveWeEmittedData &&
      this.insertVersionDirective &&
      ((chunk as GTFItem[])[0] || (chunk as GTFItem)) &&
      !((chunk as { directive?: string }).directive === 'gtf')
    ) {
      this.push('##gtf\n')
    }

    // if it's a sequence chunk coming down, emit a FASTA directive and
    // change to FASTA mode
    if ((chunk as { sequence?: string }).sequence && !this.fastaMode) {
      this.push('##FASTA\n')
      this.fastaMode = true
    }

    if (Array.isArray(chunk)) {
      str = chunk.map(formatItem).join('')
    } else {
      str = formatItem(chunk)
    }

    this.push(str)

    if (this.linesSinceLastSyncMark >= this.minLinesBetweenSyncMarks) {
      this.push('###\n')
      this.linesSinceLastSyncMark = 0
    } else {
      // count the number of newlines in this chunk
      let count = 0
      for (let i = 0; i < (str as string).length; i += 1) {
        if ((str as string)[i] === '\n') {
          count += 1
        }
      }
      this.linesSinceLastSyncMark += count
    }

    this.haveWeEmittedData = true
    _callback(callback)
  }
}

/**
 * Format a stream of items (of the type produced
 * by this script) into a stream of GTF text.
 *
 * Inserts synchronization (###) marks automatically.
 *
 * @param {Object} options
 * @param {Object} options.minSyncLines minimum number of lines between ### marks. default 100
 * @param {Boolean} options.insertVersionDirective
 *  if the first item in the stream is not a ##gff-version directive, insert one to show it's gtf
 *  default false
 */
export function formatStream(options?: FormattingOptions) {
  return new FormattingTransform(options)
}

/**
 * Format a stream of items (of the type produced
 * by this script) into a GTF file and write it to the filesystem.

 * Inserts synchronization (###) marks and a ##gtf
 * directive automatically (if one is not already present).
 *
 * @param {ReadableStream} stream the stream to write to the file
 * @param {String} filename the file path to write to
 * @param {Object} options
 * @param {String} options.encoding default 'utf8'. encoding for the written file
 * @param {Number} options.minSyncLines
 *  minimum number of lines between sync (###) marks. default 100
 * @param {Boolean} options.insertVersionDirective
 *  if the first item in the stream is not a ##gtf directive, insert one.
 *  default false
 * @returns {Promise} promise for the written filename
 */
export function formatFile(
  stream: NodeJS.ReadableStream,
  filename: string,
  options: FormattingOptions = {},
) {
  const newOptions = Object.assign(
    {
      insertVersionDirective: false,
    },
    options,
  )

  return new Promise((resolve, reject) => {
    stream
      .pipe(new FormattingTransform(newOptions))
      .on('end', () => resolve(filename))
      .on('error', reject)
      .pipe(
        fs.createWriteStream(filename, {
          encoding: newOptions.encoding || 'utf8',
        }),
      )
  })
}

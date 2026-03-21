/** @module util */

// Forks @gmod/gff-js and adapts it to parse and format GTF.

const fieldNames = [
  'seq_name',
  'source',
  'featureType',
  'start',
  'end',
  'score',
  'strand',
  'frame',
  'attributes',
]

export interface GTFAttributes {
  [key: string]: string[]
}

export interface GTFFeature {
  seq_name: string | null
  source: string | null
  featureType: string | null
  start: number | null
  end: number | null
  score: number | null
  strand: string | null
  frame: string | null
  attributes: GTFAttributes
  child_features?: GTFFeatureLine[][]
  derived_features?: GTFFeatureLine[][]
  [key: string]: unknown
}

export type GTFFeatureLine = GTFFeature

export interface GTFDirective {
  directive: string
  value?: string
  seq_id?: string
  start?: string
  end?: string
  source?: string
  buildname?: string
}

export interface GTFComment {
  comment: string
}

export interface GTFSequence {
  id: string
  description?: string
  sequence: string
}

export type GTFItem =
  | GTFFeature
  | GTFFeatureLine[]
  | GTFDirective
  | GTFComment
  | GTFSequence

// TODO: check about enconding/escaping in gtf 9th column
/**
 * Unescape a string/text value used in a GTF attribute.
 * Textual attributes should be surrounded by double quotes
 * source info:
 * https://mblab.wustl.edu/GTF22.html
 * https://en.wikipedia.org/wiki/Gene_transfer_format
 *
 * @param {String} s
 * @returns {String}
 */
export function unescape(s: string | null) {
  if (s === null) {
    return null
  }
  return String(s).replace(/%([0-9A-Fa-f]{2})/g, (_, seq) =>
    String.fromCharCode(parseInt(seq, 16)),
  )
}

/**
 * Escape a value for use in a GTF attribute value.
 *
 * @param {String} s
 * @returns {String}
 */
function _escape(regex: RegExp, s: unknown) {
  return String(s).replace(regex, ch => {
    let hex = ch.charCodeAt(0).toString(16).toUpperCase()

    // lol, apparently there's no native function for fixed-width hex output
    if (hex.length < 2) {
      hex = `0${hex}`
    }
    return `%${hex}`
  })
}

export function escape(s: unknown) {
  // eslint-disable-next-line no-control-regex
  return _escape(/[\n;\r\t=%&,\x00-\x1f\x7f-\xff]/g, s)
}

/**
 * Escape a value for use in a GTF column value.
 *
 * @param {String} s
 * @returns {String}
 */
export function escapeColumn(s: unknown) {
  // eslint-disable-next-line no-control-regex
  return _escape(/[\n\r\t%\x00-\x1f\x7f-\xff]/g, s)
}

/**
 * Parse the 9th column (attributes) of a GTF feature line.
 *
 * @param {String} attrString
 * @returns {Object}
 */
export function parseAttributes(attrString: string | null): GTFAttributes {
  if (!(attrString && attrString.length) || attrString === '.') {
    return {}
  }

  const attrs: GTFAttributes = {}

  attrString
    .replace(/\r?\n$/, '')
    .slice(0, -1) // need to remove the last semicolon in the attributes
    .split(';')
    .forEach(attribute => {
      if (!attribute) {
        return
      }
      const attr = attribute.trim().split(' ')
      if (!(attr[1] && attr[1].length)) {
        return
      }

      attr[0] = attr[0].trim()
      let arec = attrs[attr[0].trim()]
      if (!arec) {
        arec = []
        attrs[attr[0]] = arec
      }

      // arec.push(unescape(attr[1].trim()))
      arec.push(
        ...(attr[1]
          .split(',')
          .map(s => s.trim())
          .map(unescape) as string[]),
      )
    })
  return attrs
}

/**
 * Parse a GTF feature line.
 *
 * @param {String} line
 * returns the parsed line in an object
 */
export function parseFeature(line: string): GTFFeature {
  // assumed that there are no comments at the end of a line
  // split the line into columns and replace '.' with null in each column
  const f: (string | null)[] = line.split('\t').map(a => (a === '.' ? null : a))

  // unescape only the seq_name, source, and feature columns
  f[0] = unescape(f[0])
  f[1] = unescape(f[1])
  f[2] = unescape(f[2])

  const parsed: Record<string, unknown> = {}
  for (let i = 0; i < fieldNames.length; i += 1) {
    parsed[fieldNames[i]] = f[i] === '.' ? null : f[i]
  }
  parsed['attributes'] = parseAttributes(f[8] as string | null)
  if (parsed['start'] !== null) {
    parsed['start'] = parseInt(parsed['start'] as string, 10)
  }
  if (parsed['end'] !== null) {
    parsed['end'] = parseInt(parsed['end'] as string, 10)
  }
  if (parsed['score'] !== null) {
    parsed['score'] = parseFloat(parsed['score'] as string)
  }
  return parsed as unknown as GTFFeature
}

/**
 * Parse a GTF directive/comment line.
 *
 * @param {String} line
 * @returns {Object} the information in the directive
 */
export function parseDirective(line: string): GTFDirective | null {
  const match = /^\s*##\s*(\S+)\s*(.*)/.exec(line)
  // const match = /^\s*\#\#\s*(\S+)\s*(.*)/.exec(line)
  if (!match) {
    return null
  }

  // let [, name, contents] = match
  const name = match[1]
  let contents = match[2]
  const parsed: GTFDirective = { directive: name }
  if (contents.length) {
    contents = contents.replace(/\r?\n$/, '')
    parsed.value = contents
  }

  // do a little additional parsing for sequence-region and genome-build directives
  if (name === 'sequence-region') {
    const [seqId, contentStart, contentEnd] = contents.split(/\s+/, 3)
    parsed.seq_id = seqId
    parsed.start = contentStart && contentStart.replace(/\D/g, '')
    parsed.end = contentEnd && contentEnd.replace(/\D/g, '')
  } else if (name === 'genome-build') {
    const [source, buildname] = contents.split(/\s+/, 2)
    parsed.source = source
    parsed.buildname = buildname
  }

  return parsed
}

/**
 * Format an attributes object into a string suitable for the 9th column of GTF.
 *
 * @param {Object} attrs
 */
export function formatAttributes(attrs: GTFAttributes) {
  const attrOrder: string[] = []
  Object.keys(attrs).forEach(tag => {
    const val = attrs[tag]
    let valstring
    // eslint-disable-next-line no-prototype-builtins
    if (
      (val as unknown as Record<string, unknown>).hasOwnProperty('toString')
    ) {
      valstring = escape((val as unknown as { toString(): string }).toString())
    } else if (
      Array.isArray((val as unknown as { values?: unknown[] }).values)
    ) {
      valstring = (val as unknown as { values: unknown[] }).values
        .map(escape)
        .join(',')
    } else if (Array.isArray(val)) {
      valstring = val.map(escape).join(',')
    } else {
      valstring = escape(val)
    }
    attrOrder.push(`${escape(tag)} ${valstring}`)
  })
  return attrOrder.length ? attrOrder.join('; ').concat(';') : '.'
}

const translateStrand = ['-', '.', '+']

function _formatSingleFeature(
  f: GTFFeature,
  seenFeature: Record<string, boolean>,
) {
  const attrString =
    f.attributes === null || f.attributes === undefined
      ? '.'
      : formatAttributes(f.attributes)

  const fields: string[] = []
  for (let i = 0; i < 8; i += 1) {
    const val = f[fieldNames[i]]
    // deserialize strand
    if (i === 6) {
      fields[i] =
        val === null || val === undefined
          ? '.'
          : translateStrand[(val as number) + 1] || String(val)
    } else {
      fields[i] =
        val === null || val === undefined ? '.' : escapeColumn(String(val))
    }
  }
  fields[8] = attrString

  const formattedString = `${fields.join('\t')}\n`

  // if we have already output this exact feature, skip it
  if (seenFeature[formattedString]) {
    return ''
  }

  // eslint-disable-next-line no-param-reassign
  seenFeature[formattedString] = true
  return formattedString
}

function _formatFeature(
  feature: GTFFeature | GTFFeature[],
  seenFeature: Record<string, boolean>,
): string {
  if (Array.isArray(feature)) {
    return feature.map(f => _formatFeature(f, seenFeature)).join('')
  }

  const strings = [_formatSingleFeature(feature, seenFeature)]
  ;['child_features', 'derived_features'].forEach(multiSlot => {
    if (feature[multiSlot]) {
      strings.push(
        ...(feature[multiSlot] as GTFFeature[][]).map(f =>
          _formatFeature(f, seenFeature),
        ),
      )
    }
  })
  return strings.join('')
}

/**
 * Format a feature object or array of
 * feature objects into one or more lines of GTF.
 *
 * @param {Object|Array[Object]} featureOrFeatures
 */
export function formatFeature(featureOrFeatures: GTFFeature | GTFFeature[]) {
  const seen: Record<string, boolean> = {}
  return _formatFeature(featureOrFeatures, seen)
}

/**
 * Format a directive into a line of GTF.
 *
 * @param {Object} directive
 * @returns {String}
 */
export function formatDirective(directive: GTFDirective) {
  let str = `##${directive.directive}`
  if (directive.value) {
    str += ` ${directive.value}`
  }
  str += '\n'
  return str
}

/**
 * Format a comment into a GTF comment.
 * Yes I know this is just adding a # and a newline.
 *
 * @param {Object} comment
 * @returns {String}
 */
export function formatComment(comment: GTFComment) {
  return `# ${comment.comment}\n`
}

/**
 * Format a sequence object as FASTA
 *
 * @param {Object} seq
 * @returns {String} formatted single FASTA sequence
 */
export function formatSequence(seq: GTFSequence) {
  return `>${seq.id}${seq.description ? ` ${seq.description}` : ''}\n${
    seq.sequence
  }\n`
}

/**
 * Format a directive, comment, or feature,
 * or array of such items, into one or more lines of GTF.
 *
 * @param {Object|Array} itemOrItems
 */
export function formatItem(itemOrItems: GTFItem | GTFItem[]) {
  function formatSingleItem(item: GTFItem) {
    const itemAsArr = item as GTFFeatureLine[]
    const itemAsFeature = item as GTFFeature
    if (itemAsArr[0] || itemAsFeature.attributes) {
      return formatFeature(item as unknown as GTFFeature)
    }
    if ((item as GTFDirective).directive) {
      return formatDirective(item as GTFDirective)
    }
    if ((item as GTFSequence).sequence) {
      return formatSequence(item as GTFSequence)
    }
    if ((item as GTFComment).comment) {
      return formatComment(item as GTFComment)
    }
    return '# (invalid item found during format)\n'
  }

  if (Array.isArray(itemOrItems)) {
    return itemOrItems.map(item => formatSingleItem(item))
  }
  return formatSingleItem(itemOrItems)
}

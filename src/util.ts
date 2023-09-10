//@ts-nocheck
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
export function unescape(s) {
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
function _escape(regex, s) {
  return String(s).replace(regex, ch => {
    let hex = ch.charCodeAt(0).toString(16).toUpperCase()

    // lol, apparently there's no native function for fixed-width hex output
    if (hex.length < 2) {
      hex = `0${hex}`
    }
    return `%${hex}`
  })
}

export function escape(s) {
  // eslint-disable-next-line no-control-regex
  return _escape(/[\n;\r\t=%&,\x00-\x1f\x7f-\xff]/g, s)
}

/**
 * Escape a value for use in a GTF column value.
 *
 * @param {String} s
 * @returns {String}
 */
export function escapeColumn(s) {
  // eslint-disable-next-line no-control-regex
  return _escape(/[\n\r\t%\x00-\x1f\x7f-\xff]/g, s)
}

/**
 * Parse the 9th column (attributes) of a GTF feature line.
 *
 * @param {String} attrString
 * @returns {Object}
 */
export function parseAttributes(attrString) {
  if (!(attrString && attrString.length) || attrString === '.') {
    return {}
  }

  const attrs = {}

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
        ...attr[1]
          .split(',')
          .map(s => s.trim())
          .map(unescape),
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
export function parseFeature(line) {
  // assumed that there are no comments at the end of a line
  // split the line into columns and replace '.' with null in each column
  const f = line.split('\t').map(a => (a === '.' ? null : a))

  // unescape only the seq_name, source, and feature columns
  f[0] = unescape(f[0])
  f[1] = unescape(f[1])
  f[2] = unescape(f[2])

  f[8] = parseAttributes(f[8])
  const parsed = {}
  for (let i = 0; i < fieldNames.length; i += 1) {
    parsed[fieldNames[i]] = f[i] === '.' ? null : f[i]
  }
  if (parsed.start !== null) {
    parsed.start = parseInt(parsed.start, 10)
  }
  if (parsed.end !== null) {
    parsed.end = parseInt(parsed.end, 10)
  }
  if (parsed.score !== null) {
    parsed.score = parseFloat(parsed.score, 10)
  }
  if (parsed.strand != null) {
    parsed.strand = parsed.strand
  }
  return parsed
}

/**
 * Parse a GTF directive/comment line.
 *
 * @param {String} line
 * @returns {Object} the information in the directive
 */
export function parseDirective(line) {
  const match = /^\s*##\s*(\S+)\s*(.*)/.exec(line)
  // const match = /^\s*\#\#\s*(\S+)\s*(.*)/.exec(line)
  if (!match) {
    return null
  }

  // let [, name, contents] = match
  const name = match[1]
  let contents = match[2]
  const parsed = { directive: name }
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
export function formatAttributes(attrs) {
  const attrOrder = []
  Object.keys(attrs).forEach(tag => {
    const val = attrs[tag]
    let valstring
    // eslint-disable-next-line no-prototype-builtins
    if (val.hasOwnProperty('toString')) {
      valstring = escape(val.toString())
    } else if (Array.isArray(val.values)) {
      valstring = val.values.map(escape).join(',')
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

function _formatSingleFeature(f, seenFeature) {
  const attrString =
    f.attributes === null || f.attributes === undefined
      ? '.'
      : formatAttributes(f.attributes)

  const fields = []
  for (let i = 0; i < 8; i += 1) {
    const val = f[fieldNames[i]]
    // deserialize strand
    if (i === 6) {
      fields[i] =
        val === null || val === undefined
          ? '.'
          : translateStrand[val + 1] || val
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

function _formatFeature(feature, seenFeature) {
  if (Array.isArray(feature)) {
    return feature.map(f => _formatFeature(f, seenFeature)).join('')
  }

  const strings = [_formatSingleFeature(feature, seenFeature)]
  ;['child_features', 'derived_features'].forEach(multiSlot => {
    if (feature[multiSlot]) {
      strings.push(
        ...feature[multiSlot].map(f => _formatFeature(f, seenFeature)),
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
export function formatFeature(featureOrFeatures) {
  const seen = {}
  return _formatFeature(featureOrFeatures, seen)
}

/**
 * Format a directive into a line of GTF.
 *
 * @param {Object} directive
 * @returns {String}
 */
export function formatDirective(directive) {
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
export function formatComment(comment) {
  return `# ${comment.comment}\n`
}

/**
 * Format a sequence object as FASTA
 *
 * @param {Object} seq
 * @returns {String} formatted single FASTA sequence
 */
export function formatSequence(seq) {
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
export function formatItem(itemOrItems) {
  function formatSingleItem(item) {
    if (item[0] || item.attributes) {
      return formatFeature(item)
    }
    if (item.directive) {
      return formatDirective(item)
    }
    if (item.sequence) {
      return formatSequence(item)
    }
    if (item.comment) {
      return formatComment(item)
    }
    return '# (invalid item found during format)\n'
  }

  if (Array.isArray(itemOrItems)) {
    return itemOrItems.map(item => formatSingleItem(item))
  }
  return formatSingleItem(itemOrItems)
}

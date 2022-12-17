# @gmod/gtf

[![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/gtf-js/push.yml?branch=main)](https://github.com/GMOD/gtf-js/actions)

GTF or the General Transfer Format is identical to GFF version2. This module was
created to read and write GTF data. This module aims to be a complete
implementation of the [GTF specification](https://mblab.wustl.edu/GTF22.html).

- streaming parsing and streaming formatting
- creates transcript features with children_features
- only compatible with GTF

Note: For JBrowse, we generally encourage GFF3 over GTF

For GFF3, checkout
[@gmod/gff-js package found here](https://github.com/GMOD/gff-js)

## Install

    $ npm install --save @gmod/gtf

## Usage

```js

import gtf from '@gmod/gtf'

// parse a file from a file name
gtf.parseFile('path/to/my/file.gtf', { parseAll: true })
.on('data', data => {
  if (data.directive) {
    console.log('got a directive',data)
  }
  else if (data.comment) {
    console.log('got a comment',data)
  }
  else if (data.sequence) {
    console.log('got a sequence from a FASTA section')
  }
  else {
    console.log('got a feature',data)
  }
})

// parse a stream of GTF text
const fs = require('fs')
fs.createReadStream('path/to/my/file.gtf')
.pipe(gtf.parseStream())
.on('data', data => {
  console.log('got item',data)
  return data
})
.on('end', () => {
  console.log('done parsing!')
})

// parse a string of gtf synchronously
let stringOfGTF = fs
  .readFileSync('my_annotations.gtf')
  .toString()
let arrayOfThings = gtf.parseStringSync(stringOfGTF)

// format an array of items to a string
let stringOfGTF = gtf.formatSync(arrayOfThings)

// format a stream of things to a stream of text.
// inserts sync marks automatically.
// note: this could create new gtf lines for transcript features
myStreamOfGTFObjects
.pipe(gtf.formatStream())
.pipe(fs.createWriteStream('my_new.gtf'))

// format a stream of things and write it to
// a gtf file. inserts sync marks
//  note: this could create new gtf lines for transcript features
myStreamOfGTFObjects
.pipe(gtf.formatFile('path/to/destination.gtf')
```

## Object format

### features

Because GTF can not handle a 3 level hiearchy (gene -> transcript -> exon), we
parse GTF by creating transcript features with children features.

We do not create features from the gene_id. Values that are `.` in the GTF are
`null` in the output.

```gtf line
ctgA	bare_predicted	CDS	10000	11500	.	+	0	transcript_id "Apple1";
```

Note: that is creates an additional transcript feature from the transcript id
when featureType is not 'transcript'. It will then create a child CDS feature
from the line of GTF shown above.

    [
        [
            {
                "seq_name": "ctgA",
                "source": "bare_predicted",
                "featureType": "transcript",
                "start": 10000,
                "end": 11500,
                "score": null,
                "strand": "+",
                "frame": "0",
                "attributes": { "transcript_id": [ "\"Apple1\"" ] },
                "child_features": [[
                    {
                        "seq_name": "ctgA",
                        "source": "bare_predicted",
                        "featureType": "CDS",
                        "start": 10000,
                        "end": 11500,
                        "score": null,
                        "strand": "+",
                        "frame": "0",
                        "attributes": { "transcript_id": [ "\"Apple1\"" ] },
                        "child_features": [],
                        "derived_features": []
                    }
                ]],
                "derived_features": []
            }
        ]
    ]

### directives, comments, sequences

```js
parseDirective("##gtf\n")
// returns
{
  "directive": "gtf",
}

parseComment('# hi this is a comment\n')
// returns
{
  "comment": "hi this is a comment"
}

//These come from any embedded `##FASTA` section in the GTF file.
{
  "id": "ctgA",
  "description": "test contig",
  "sequence": "ACTGACTAGCTAGCATCAGCGTCGTAGCTATTATATTACGGTAGCCA"
}
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

- [parseStream](#parsestream)
  - [Parameters](#parameters)
- [parseFile](#parsefile)
  - [Parameters](#parameters-1)
- [parseStringSync](#parsestringsync)
  - [Parameters](#parameters-2)
- [formatSync](#formatsync)
  - [Parameters](#parameters-3)
- [formatStream](#formatstream)
  - [Parameters](#parameters-4)
- [formatFile](#formatfile)
  - [Parameters](#parameters-5)

### parseStream

Parse a stream of text data into a stream of feature, directive, and comment
objects.

#### Parameters

- `options`
  **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
  optional options object (optional, default `{}`)

  - `options.encoding`
    **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
    text encoding of the input GTF. default 'utf8'
  - `options.parseAll`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default false. if true, will parse all items. overrides other flags
  - `options.parseFeatures`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default true
  - `options.parseDirectives`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default false
  - `options.parseComments`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default false
  - `options.parseSequences`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default true
  - `options.bufferSize`
    **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**
    maximum number of GTF lines to buffer. defaults to 1000

Returns **ReadableStream** stream (in objectMode) of parsed items

### parseFile

Read and parse a GTF file from the filesystem.

#### Parameters

- `filename`
  **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
  the filename of the file to parse
- `options`
  **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
  optional options object

  - `options.encoding`
    **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
    the file's string encoding, defaults to 'utf8'
  - `options.parseAll`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default false. if true, will parse all items. overrides other flags
  - `options.parseFeatures`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default true
  - `options.parseDirectives`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default false
  - `options.parseComments`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default false
  - `options.parseSequences`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default true
  - `options.bufferSize`
    **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**
    maximum number of GTF lines to buffer. defaults to 1000

Returns **ReadableStream** stream (in objectMode) of parsed items

### parseStringSync

Synchronously parse a string containing GTF and return an arrayref of the parsed
items.

#### Parameters

- `str`
  **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
- `inputOptions`
  **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
  optional options object (optional, default `{}`)

  - `inputOptions.parseAll`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default false. if true, will parse all items. overrides other flags
  - `inputOptions.parseFeatures`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default true
  - `inputOptions.parseDirectives`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default false
  - `inputOptions.parseComments`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default false
  - `inputOptions.parseSequences`
    **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    default true

Returns
**[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)**
array of parsed features, directives, and/or comments

### formatSync

Format an array of GTF items (features,directives,comments) into string of GTF.
Does not insert synchronization (###) marks. Does not insert directive if it's
not already there.

#### Parameters

- `items` &#x20;

Returns
**[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
the formatted GTF

### formatStream

Format a stream of items (of the type produced by this script) into a stream of
GTF text.

Inserts synchronization (###) marks automatically.

#### Parameters

- `options`
  **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

  - `options.minSyncLines`
    **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
    minimum number of lines between ### marks. default 100
  - `options.insertVersionDirective`
    **[Boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    if the first item in the stream is not a ##gff-version directive, insert one
    to show it's gtf default false

### formatFile

Format a stream of items (of the type produced by this script) into a GTF file
and write it to the filesystem.

Inserts synchronization (###) marks and a ##gtf directive automatically (if one
is not already present).

#### Parameters

- `stream` **ReadableStream** the stream to write to the file
- `filename`
  **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
  the file path to write to
- `options`
  **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
  (optional, default `{}`)

  - `options.encoding`
    **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
    default 'utf8'. encoding for the written file
  - `options.minSyncLines`
    **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**
    minimum number of lines between sync (###) marks. default 100
  - `options.insertVersionDirective`
    **[Boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    if the first item in the stream is not a ##gtf directive, insert one.
    default false

Returns
**[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)**
promise for the written filename

## util

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

- [util](#util)
- [unescape](#unescape)
  - [Parameters](#parameters)
- [\_escape](#_escape)
  - [Parameters](#parameters-1)
- [escapeColumn](#escapecolumn)
  - [Parameters](#parameters-2)
- [parseAttributes](#parseattributes)
  - [Parameters](#parameters-3)
- [parseFeature](#parsefeature)
  - [Parameters](#parameters-4)
- [parseDirective](#parsedirective)
  - [Parameters](#parameters-5)
- [formatAttributes](#formatattributes)
  - [Parameters](#parameters-6)
- [formatFeature](#formatfeature)
  - [Parameters](#parameters-7)
- [formatDirective](#formatdirective)
  - [Parameters](#parameters-8)
- [formatComment](#formatcomment)
  - [Parameters](#parameters-9)
- [formatSequence](#formatsequence)
  - [Parameters](#parameters-10)
- [formatItem](#formatitem)
  - [Parameters](#parameters-11)

### util

### unescape

Unescape a string/text value used in a GTF attribute. Textual attributes should
be surrounded by double quotes source info: <https://mblab.wustl.edu/GTF22.html>
<https://en.wikipedia.org/wiki/Gene_transfer_format>

#### Parameters

- `s`
  **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns
**[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

### \_escape

Escape a value for use in a GTF attribute value.

#### Parameters

- `regex` &#x20;
- `s`
  **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns
**[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

### escapeColumn

Escape a value for use in a GTF column value.

#### Parameters

- `s`
  **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns
**[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

### parseAttributes

Parse the 9th column (attributes) of a GTF feature line.

#### Parameters

- `attrString`
  **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns
**[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

### parseFeature

Parse a GTF feature line.

#### Parameters

- `line`
  **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
  returns the parsed line in an object

### parseDirective

Parse a GTF directive/comment line.

#### Parameters

- `line`
  **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns
**[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
the information in the directive

### formatAttributes

Format an attributes object into a string suitable for the 9th column of GTF.

#### Parameters

- `attrs`
  **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

### formatFeature

Format a feature object or array of feature objects into one or more lines of
GTF.

#### Parameters

- `featureOrFeatures` &#x20;

### formatDirective

Format a directive into a line of GTF.

#### Parameters

- `directive`
  **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

Returns
**[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

### formatComment

Format a comment into a GTF comment. Yes I know this is just adding a # and a
newline.

#### Parameters

- `comment`
  **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

Returns
**[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

### formatSequence

Format a sequence object as FASTA

#### Parameters

- `seq`
  **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

Returns
**[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
formatted single FASTA sequence

### formatItem

Format a directive, comment, or feature, or array of such items, into one or
more lines of GTF.

#### Parameters

- `itemOrItems`
  **([Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)
  |
  [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array))**&#x20;

## Notes and resources

- This is an adaptation of the
  [JBrowse GTF parser](https://github.com/GMOD/jbrowse/blob/master/src/JBrowse/Store/SeqFeature/GTF/Parser.js)
- [GTF docs](https://en.wikipedia.org/wiki/General_feature_format)

## License

MIT © [Robert Buels](https://github.com/rbuels)

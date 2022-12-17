//@ts-nocheck
import fs from 'fs'
import gtf from '../src'

// https://github.com/GMOD/GBrowse/blob/116a7dfeb1d8ecd524cdeebdc1c1a760938a2fd0/bin/gtf2gff3.pl

function readAll(filename) {
  return new Promise((resolve, reject) => {
    const stuff = {
      features: [],
      comments: [],
      directives: [],
      sequences: [],
      all: [],
    }

    // $p->max_lookback(1)
    gtf
      .parseFile(require.resolve(filename), {
        parseFeatures: true,
        parseDirectives: true,
        parseComments: true,
        parseSequences: true,
        bufferSize: 10,
      })
      .on('data', d => {
        stuff.all.push(d)
        if (d.directive) {
          stuff.directives.push(d)
        } else if (d.comment) {
          stuff.comments.push(d)
        } else if (d.sequence) {
          stuff.sequences.push(d)
        } else {
          stuff.features.push(d)
        }
      })
      .on('end', () => {
        resolve(stuff)
      })
      .on('error', reject)
  })
}

describe('Gtf parser', () => {
  it('can parse volvox.sorted.gtf', async () => {
    const stuff = await readAll('./data/volvox.sorted.gtf')
    const referenceResult = JSON.parse(
      fs.readFileSync(require.resolve('./data/volvox.sorted.result.json')),
    )
    expect(stuff.all).toEqual(referenceResult)
  })
  ;[
    [2, 'demo.gtf'],
    [6, 'volvox.sorted.gtf'],
  ].forEach(([count, filename]) => {
    it(`can cursorily parse ${filename}`, async () => {
      const stuff = await readAll(`./data/${filename}`)
      expect(stuff.all.length).toEqual(count)
    })
  })

  it('can parse a string synchronously', () => {
    const gtfString = fs
      .readFileSync(require.resolve('./data/demo.gtf'))
      .toString('utf8')
    const result = gtf.parseStringSync(gtfString, {
      parseFeatures: true,
      parseDirectives: true,
      parseComments: true,
    })
    //  ENSVPAG00000000407 and ENSVPAG00000009976
    expect(result).toHaveLength(2)
    const referenceResult = JSON.parse(
      fs.readFileSync(require.resolve('./data/demo.result.json')),
    )
    expect(result).toEqual(referenceResult)
  })

  it('can parse another string synchronously', () => {
    const gtfLine = `ctgA	example	exon	1050	1500	.	+	.	transcript_id "EDEN.1"; gene_id "EDEN"; gene_name "EDEN";
  `

    const result = gtf.parseStringSync(gtfLine, {
      parseFeatures: true,
      parseDirectives: true,
      parseComments: true,
    })
    expect(result).toHaveLength(1)
    const referenceResult = [
      [
        {
          seq_name: 'ctgA',
          source: 'example',
          featureType: 'transcript',
          start: 1050,
          end: 1500,
          score: null,
          strand: '+',
          frame: null,
          attributes: {
            gene_id: ['"EDEN"'],
            transcript_id: ['"EDEN.1"'],
            gene_name: ['"EDEN"'],
          },
          child_features: [
            [
              {
                seq_name: 'ctgA',
                source: 'example',
                featureType: 'exon',
                start: 1050,
                end: 1500,
                score: null,
                strand: '+',
                frame: null,
                attributes: {
                  gene_id: ['"EDEN"'],
                  transcript_id: ['"EDEN.1"'],
                  gene_name: ['"EDEN"'],
                },
                child_features: [],
                derived_features: [],
              },
            ],
          ],
          derived_features: [],
        },
      ],
    ]

    expect(result).toEqual(referenceResult)
    // trying to support the Cufflinks convention of adding a transcript line
    // can't do a round trip since the output adds transcripts as parent features
  })

  it('can be written to directly', async () => {
    const items = await new Promise((resolve, reject) => {
      const i = []
      const stream = gtf
        .parseStream()
        .on('data', d => i.push(d))
        .on('end', () => resolve(i))
        .on('error', reject)

      stream.write(
        `ctgA	example	exon	1050	1500	.	+	.	transcript_id "EDEN.1"; gene_id "EDEN"; gene_name "EDEN";\n`,
      )
      stream.end()
    })

    expect(items).toHaveLength(1)
    expect(items[0][0].seq_name).toEqual('ctgA')
  })
})

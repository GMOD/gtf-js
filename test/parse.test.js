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
        if (d.directive) stuff.directives.push(d)
        else if (d.comment) stuff.comments.push(d)
        else if (d.sequence) stuff.sequences.push(d)
        else stuff.features.push(d)
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

  //   it('can parse some whitespace', () => {
  //     const gff3 = `
  // SL2.40%25ch01	IT%25AG eugene	g%25e;ne	80999140	81004317	.	+	.	 multivalue = val1,val2, val3;testing = blah
  // `

  //     const result = gtf.parseStringSync(gff3, {
  //       parseFeatures: true,
  //       parseDirectives: true,
  //       parseComments: true,
  //     })
  //     expect(result).toHaveLength(1)
  //     const referenceResult = [
  //       [
  //         {
  //           seq_id: 'SL2.40%ch01',
  //           source: 'IT%AG eugene',
  //           type: 'g%e;ne',
  //           start: 80999140,
  //           end: 81004317,
  //           score: null,
  //           strand: '+',
  //           phase: null,
  //           attributes: {
  //             multivalue: ['val1', 'val2', 'val3'],
  //             testing: ['blah'],
  //           },
  //           child_features: [],
  //           derived_features: [],
  //         },
  //       ],
  //     ]

  //     expect(result).toEqual(referenceResult)
  //   })
  //   it('can parse another string synchronously', () => {
  //     const gff3 = `
  // SL2.40%25ch01	IT%25AG eugene	g%25e;ne	80999140	81004317	.	+	.	Alias=Solyc01g098840;ID=gene:Solyc01g098840.2;Name=Solyc01g098840.2;from_BOGAS=1;length=5178
  // `

  //     const result = gtf.parseStringSync(gff3, {
  //       parseFeatures: true,
  //       parseDirectives: true,
  //       parseComments: true,
  //     })
  //     expect(result).toHaveLength(1)
  //     const referenceResult = [
  //       [
  //         {
  //           seq_id: 'SL2.40%ch01',
  //           source: 'IT%AG eugene',
  //           type: 'g%e;ne',
  //           start: 80999140,
  //           end: 81004317,
  //           score: null,
  //           strand: '+',
  //           phase: null,
  //           attributes: {
  //             Alias: ['Solyc01g098840'],
  //             ID: ['gene:Solyc01g098840.2'],
  //             Name: ['Solyc01g098840.2'],
  //             from_BOGAS: ['1'],
  //             length: ['5178'],
  //           },
  //           child_features: [],
  //           derived_features: [],
  //         },
  //       ],
  //     ]

  //     expect(result).toEqual(referenceResult)
  //     expect(`\n${formatFeature(referenceResult[0])}`).toEqual(gff3)
  //   })
  //   ;[
  //     [
  //       'hybrid1.gff3',
  //       [
  //         {
  //           id: 'A00469',
  //           sequence: 'GATTACAGATTACA',
  //         },
  //         {
  //           id: 'zonker',
  //           sequence:
  //             'AAAAAACTAGCATGATCGATCGATCGATCGATATTAGCATGCATGCATGATGATGATAGCTATGATCGATCCCCCCCAAAAAACTAGCATGATCGATCGATCGATCGATATTAGCATGCATGCATGATGATGATAGCTATGATCGATCCCCCCC',
  //         },
  //         {
  //           id: 'zeebo',
  //           description: 'this is a test description',
  //           sequence:
  //             'AAAAACTAGTAGCTAGCTAGCTGATCATAGATCGATGCATGGCATACTGACTGATCGACCCCCC',
  //         },
  //       ],
  //     ],
  //     [
  //       'hybrid2.gff3',
  //       [
  //         {
  //           id: 'A00469',
  //           sequence: 'GATTACAWATTACABATTACAGATTACA',
  //         },
  //       ],
  //     ],
  //   ].forEach(([filename, expectedOutput]) => {
  //     it(`can parse FASTA sections in hybrid ${filename} file`, async () => {
  //       const stuff = await readAll(`./data/${filename}`)
  //       expect(stuff.sequences).toEqual(expectedOutput)
  //     })
  //   })

  //   it('can be written to directly', async () => {
  //     const items = await new Promise((resolve, reject) => {
  //       const i = []
  //       const stream = gtf
  //         .parseStream()
  //         .on('data', d => i.push(d))
  //         .on('end', () => resolve(i))
  //         .on('error', reject)

  //       stream.write(
  //         `SL2.40ch00	ITAG_eugene	gene	16437	18189	.	+	.	Alias=Solyc00g005000;ID=gene:Solyc00g005000.2;Name=Solyc00g005000.2;from_BOGAS=1;length=1753\n`,
  //       )
  //       stream.end()
  //     })

  //     expect(items).toHaveLength(1)
  //     expect(items[0][0].seq_id).toEqual('SL2.40ch00')
  //   })
})

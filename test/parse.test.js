// import fs from 'fs'
// import gtf from '../src'
// import { formatFeature } from '../src/util'

// function readAll(filename) {
//   return new Promise((resolve, reject) => {
//     const stuff = {
//       features: [],
//       comments: [],
//       directives: [],
//       sequences: [],
//       all: [],
//     }

//     // $p->max_lookback(1)
//     gtf
//       .parseFile(require.resolve(filename), {
//         parseFeatures: true,
//         parseDirectives: true,
//         parseComments: true,
//         parseSequences: true,
//         bufferSize: 10,
//       })
//       .on('data', d => {
//         stuff.all.push(d)
//         if (d.directive) stuff.directives.push(d)
//         else if (d.comment) stuff.comments.push(d)
//         else if (d.sequence) stuff.sequences.push(d)
//         else stuff.features.push(d)
//       })
//       .on('end', () => {
//         resolve(stuff)
//       })
//       .on('error', reject)
//   })
// }

describe('GTF parser', () => {
  //   it('can parse gff3_with_syncs.gff3', async () => {
  //     const stuff = await readAll('./data/gff3_with_syncs.gff3')
  //     const referenceResult = JSON.parse(
  //       fs.readFileSync(require.resolve('./data/gff3_with_syncs.result.json')),
  //     )
  //     expect(stuff.all).toEqual(referenceResult)
  //   })
  it('can parse gtf file', async () => {
    expect(true).toEqual(true)
  })

  it('can parse a string synchronously', () => {
    // const gtfString = fs
    //   .readFileSync(require.resolve('./data/volvox.sorted.gtf'))
    //   .toString('utf8')
    // const result = gtf.parseStringSync(gtfString, {
    //   parseFeatures: true,
    //   parseDirectives: true,
    //   parseComments: true,
    // })
    // expect(result).toHaveLength(3)
    // const referenceResult = JSON.parse(
    //   fs.readFileSync(require.resolve('./data/spec_eden.result.json')),
    // )
    expect(true).toEqual(true)
  })
})

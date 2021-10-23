import fs from 'fs'
import tmp from 'tmp-promise'

import { promisify } from 'es6-promisify'
import getStream from 'get-stream'

import gtf from '../src'

const readfile = promisify(fs.readFile)
const fdatasync = promisify(fs.fdatasync)

describe('GTF formatting', () => {
  it(`can roundtrip a gtf file with formatSync`, () => {
    const inputGTF = fs
      .readFileSync(require.resolve(`./data/hybrid.gtf`))
      .toString('utf8')

    const expectedGTF = fs
      .readFileSync(require.resolve(`./data/hybrid.reformatted.gtf`))
      .toString('utf8')
      .replace(/###\n/g, '') // formatSync does not insert sync marks

    const items = gtf.parseStringSync(inputGTF, { parseAll: true })
    const resultGTF = gtf.formatSync(items)
    expect(resultGTF).toEqual(expectedGTF)
  })

  it(`can roundtrip  a gtf file with formatStream`, async () => {
    const expectedGTF = (
      await readfile(require.resolve(`./data/hybrid.reformatted.gtf`))
    ).toString('utf8')

    const resultGTF = await getStream(
      fs
        .createReadStream(require.resolve(`./data/hybrid.gtf`))
        .pipe(
          gtf.parseStream({
            parseFeatures: true,
            parseComments: true,
            parseDirectives: true,
          }),
        )
        .pipe(gtf.formatStream()),
    )
    expect(resultGTF).toEqual(expectedGTF)
  })
  it(`can roundtrip gtf with formatFile`, async () => {
    jest.setTimeout(1000)
    await tmp.withFile(async tmpFile => {
      const gtfIn = fs
        .createReadStream(require.resolve(`./data/demo2.gtf`))
        .pipe(gtf.parseStream({ parseAll: true }))

      await gtf.formatFile(gtfIn, tmpFile.path)
      await fdatasync(tmpFile.fd)

      const resultGTF = (await readfile(tmpFile.path)).toString('utf8')

      const expectedGTF = (
        await readfile(require.resolve(`./data/demo2.reformatted.gtf`))
      ).toString('utf8')

      expect(resultGTF).toEqual(expectedGTF)
    })
  })
})

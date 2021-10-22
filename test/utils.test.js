import gtf from '../src'

const {
  parseAttributes,
  parseFeature,
  parseDirective,
  formatFeature,
  escapeColumn,
} = gtf.util

describe('GTF utils', () => {
  it('can escape/unescape properly', () => {
    expect(gtf.util.escape(5)).toEqual('5')
    expect(gtf.util.unescape(' ')).toEqual(' ')
    expect(gtf.util.unescape(5)).toEqual('5')
    expect(escapeColumn('Noggin,+-%Foo\tbar')).toEqual('Noggin,+-%25Foo%09bar')
  })
  it('test parsing the attributes of a gtf line', () => {
    const testAttributes = parseAttributes(
      'transcript_id "EDEN.3"; gene_id "EDEN"; gene_name "EDEN";',
    )
    // eslint-disable-next-line camelcase
    const { gene_id, transcript_id } = testAttributes
    expect(gene_id[0]).toBe('EDEN')
    expect(transcript_id[0]).toBe('EDEN.3')
  })
  it('test parsing/formating a gtf feature', () => {
    const featureLine =
      'ctgA	example	CDS	3301	3902	.	+	0	transcript_id "EDEN.3"; gene_id "EDEN"; gene_name "EDEN";'
    const testFeature = parseFeature(featureLine)
    expect(testFeature).toMatchSnapshot()
    const featureToFormat = {
      seq_name: 'ctgA',
      source: 'example',
      feature: 'CDS',
      start: 3301,
      end: 3902,
      score: null,
      strand: '+',
      frame: 0,
      attributes: {
        transcript_id: 'EDEN.3',
        gene_id: 'EDEN',
        gene_name: 'EDEN',
      },
    }
    const formattedFeature = formatFeature(featureToFormat)
    expect(formattedFeature.trim()).toBe(featureLine.replace(/["]+/g, ''))
  })
  it('test parsing a gtf directive', () => {
    const testDirective = parseDirective('#!genome-build GRCh38.p7')
    expect(testDirective.directive).toBe('!genome-build')
  })
})

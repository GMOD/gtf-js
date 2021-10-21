import gtf from '../src'

const {
  parseAttributes,
  parseFeature,
  // parseDirective,
  // formatFeature,
  // escapeColumn,
} = gtf.util

describe('GTF utils', () => {
  it('test parsing the attributes of a gtf line', () => {
    const testAttributes = parseAttributes(
      'transcript_id "EDEN.3"; gene_id "EDEN"; gene_name "EDEN";',
    )
    // eslint-disable-next-line camelcase
    const { gene_id, transcript_id } = testAttributes
    expect(gene_id[0]).toBe('EDEN')
    expect(transcript_id[0]).toBe('EDEN.3')
  })
  it('test parsing a gtf feature', () => {
    const testFeature = parseFeature(
      'ctgA	example	CDS	3301	3902	.	+	0	transcript_id "EDEN.3"; gene_id "EDEN"; gene_name "EDEN";',
    )
    expect(testFeature).toMatchSnapshot()
  })
})

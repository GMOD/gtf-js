import gtf from '../src'

const {
  parseAttributes,
  parseFeature,
  parseDirective,
  formatFeature,
  formatItem,
  formatAttributes,
  escapeColumn,
} = gtf.util

describe('GTF utils', () => {
  it('can escape/unescape properly', () => {
    expect(gtf.util.escape(5)).toEqual('5')
    expect(gtf.util.unescape(' ')).toEqual(' ')
    expect(escapeColumn('Noggin,+-%Foo\tbar')).toEqual('Noggin,+-%25Foo%09bar')
  })
  it('test parsing/formating a gtf feature', () => {
    const featureLine =
      'ctgA	example	CDS	3301	3902	.	+	0	transcript_id "EDEN.3"; gene_id "EDEN"; gene_name "EDEN";'
    const parsedFeature = parseFeature(featureLine)
    expect(parsedFeature).toMatchSnapshot()
    const featureItem = {
      attributes: {
        transcript_id: ['"EDEN.3"'],
        gene_id: ['"EDEN"'],
        gene_name: ['"EDEN"'],
      },
      end: 3902,
      featureType: 'CDS',
      frame: '0',
      score: null,
      seq_name: 'ctgA',
      source: 'example',
      start: 3301,
      strand: '+',
    }
    expect(formatFeature(featureItem)).toEqual(
      'ctgA	example	CDS	3301	3902	.	+	0	transcript_id "EDEN.3"; gene_id "EDEN"; gene_name "EDEN";\n',
    )
    expect(formatItem(featureItem)).toBe(
      'ctgA	example	CDS	3301	3902	.	+	0	transcript_id "EDEN.3"; gene_id "EDEN"; gene_name "EDEN";\n',
    )
  })
  it('test parsing/formatting items and attributes', () => {
    const gtfComment = {
      comment: 'hi this is a comment',
    }
    const gtfDirective = {
      directive: 'gff-version',
      value: '2',
    }
    const gtfSequence = {
      id: 'ctgA',
      description: 'test contig',
      sequence: 'ACTGACTAGCTAGCATCAGCGTCGTAGCTATTATATTACGGTAGCCA',
    }
    const gtfAttributes = {
      transcript_id: ['EDEN.3'],
      gene_id: ['EDEN'],
      gene_name: ['EDEN'],
    }
    expect(formatItem(gtfComment)).toBe('# hi this is a comment\n')
    expect(formatItem(gtfDirective)).toBe('##gff-version 2\n')
    expect(formatItem(gtfSequence)).toBe(
      '>ctgA test contig\nACTGACTAGCTAGCATCAGCGTCGTAGCTATTATATTACGGTAGCCA\n',
    )
    expect(formatItem([gtfDirective, gtfSequence, gtfComment])).toEqual([
      '##gff-version 2\n',
      '>ctgA test contig\nACTGACTAGCTAGCATCAGCGTCGTAGCTATTATATTACGGTAGCCA\n',
      '# hi this is a comment\n',
    ])
    const parsedGTFDirective = parseDirective('#!genome-build GRCh38.p7')
    expect(parsedGTFDirective).toEqual({
      directive: '!genome-build',
      value: 'GRCh38.p7',
    })
    const parsedGTFAttributes = parseAttributes(
      'transcript_id "EDEN.3"; gene_id "EDEN"; gene_name "EDEN";',
    )
    expect(parsedGTFAttributes).toMatchSnapshot()
    expect(formatAttributes(gtfAttributes)).toMatchSnapshot()
    // invalid item
    expect(formatItem({ test: 'test' })).toEqual(
      '# (invalid item found during format)\n',
    )
  })
})
